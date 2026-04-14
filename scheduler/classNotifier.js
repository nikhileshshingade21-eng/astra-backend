/**
 * ASTRA Class Notification Scheduler (PostgreSQL Version)
 * Optimized for Railway + Supabase.
 */

const cron = require('node-cron');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { queryAll } = require('../database_module');
const socketService = require('../services/socketService');

// Initialize Firebase Admin SDK (supports both file and env variable)
let serviceAccount;
const credPath = path.join(__dirname, '..', 'firebase-credentials.json');

if (fs.existsSync(credPath)) {
  serviceAccount = require(credPath);
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.trim()) {
  try {
    serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  } catch (err) {
    console.error('❌ Malformed GOOGLE_APPLICATION_CREDENTIALS_JSON. Check Railway settings.');
    module.exports = { startScheduler: () => {} };
    return;
  }
} else {
  console.log('ℹ️ No Firebase credentials found. Scheduler in Idle mode.');
  module.exports = { startScheduler: () => {} };
  return;
}

// Global Identity Sync: Ensure the PEM private key is correctly parsed regardless of source
if (serviceAccount && serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim();
}

let firebaseReady = false;
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseReady = true;
    console.log('✅ Firebase Admin SDK initialized successfully.');
  } catch (fbErr) {
    console.error('⚠️ Firebase Admin SDK initialization failed:', fbErr.message);
    console.error('   Push notifications will be disabled. The scheduler will run in logging-only mode.');
    console.error('   To fix: Replace firebase-credentials.json with a fresh key from Firebase Console.');
  }
} else {
  firebaseReady = true;
}

// In-memory cache for sent notifications
const sentNotifications = new Map();

/**
 * Check for upcoming and ongoing classes
 */
let isRunning = false;
async function checkClasses() {
  if (isRunning) {
    console.log('[SCHEDULER] Previous check still running, skipping');
    return;
  }
  isRunning = true;
  try {
    console.log('🔍 Checking for upcoming classes...');

    const now = new Date();
    // Use IST timezone for current time and day
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    
    const currentTime = istTime.toISOString().substr(11, 5); // HH:mm
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[istTime.getUTCDay()];

    console.log(`📅 Current time (IST): ${currentTime}, Day: ${currentDay}`);

    // Fetch all users with FCM tokens and their classes for today
    const sql = `
      SELECT u.id as user_id, u.email, u.fcm_token, 
             c.name as subject, c.start_time, c.room
      FROM users u
      JOIN classes c ON (u.programme = c.programme AND u.section = c.section)
      WHERE u.fcm_token IS NOT NULL AND c.day = $1
    `;
    
    const results = await queryAll(sql, [currentDay]);

    let notificationCount = 0;

    for (const row of results) {
      const { user_id, email, fcm_token, subject, start_time, room } = row;

      const classStartMinutes = parseTime(start_time);
      const nowMinutes = parseTime(currentTime);
      const minutesUntilClass = classStartMinutes - nowMinutes;

      // SCENARIO 1: Class starting in 10-15 minutes (reminder)
      if (minutesUntilClass >= 10 && minutesUntilClass <= 15) {
        const notificationKey = `${user_id}_${subject}_${start_time}_reminder`;

        if (!sentNotifications.has(notificationKey)) {
          await sendNotification(fcm_token, {
            title: `📚 Upcoming: ${subject}`,
            body: `Your class starts in ${minutesUntilClass} minutes at ${start_time} in ${room || 'TBA'}`,
            data: {
              type: 'class_reminder',
              class_name: subject,
              start_time,
              room: room || 'TBA',
            },
          });

          sentNotifications.set(notificationKey, Date.now());
          
          // BRIDGE: Live In-App Pulse
          socketService.emitToUser(user_id, 'LIVE_NOTIFICATION', {
            title: `📚 Upcoming: ${subject}`,
            body: `Starts in ${minutesUntilClass}m at ${start_time}`,
            type: 'class_reminder',
            class_name: subject,
            room: room || 'TBA'
          });

          notificationCount++;
          console.log(`✅ Sent reminder to ${email} for ${subject}`);
        }
      }

      // SCENARIO 2: Class just started (0-5 minutes)
      if (minutesUntilClass >= -5 && minutesUntilClass <= 0) {
        const notificationKey = `${user_id}_${subject}_${start_time}_start`;

        if (!sentNotifications.has(notificationKey)) {
          await sendNotification(fcm_token, {
            title: `🔔 Class Started: ${subject}`,
            body: `Your class has started at ${start_time} in ${room || 'TBA'}. Mark your attendance!`,
            data: {
              type: 'class_start',
              class_name: subject,
              start_time,
              room: room || 'TBA',
            },
          });

          sentNotifications.set(notificationKey, Date.now());

          // BRIDGE: Live In-App Pulse
          socketService.emitToUser(user_id, 'LIVE_NOTIFICATION', {
            title: `🔔 Session Active: ${subject}`,
            body: `Your session has started at ${start_time}. Mark attendance!`,
            type: 'class_start',
            class_name: subject,
            room: room || 'TBA'
          });

          notificationCount++;
          console.log(`✅ Sent start notification to ${email} for ${subject}`);
        }
      }
    }

    // Clean up old notifications
    cleanupOldNotifications();

    console.log(`✅ Check complete. Sent: ${notificationCount} notifications`);
  } catch (error) {
    console.error('❌ Error checking classes:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Send Firebase Cloud Messaging notification
 */
async function sendNotification(fcmToken, { title, body, data }) {
  if (!firebaseReady) {
    console.log('[SCHEDULER] Firebase not ready, skipping push notification:', title);
    return null;
  }
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data,
      token: fcmToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'astra-class-reminders',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('📱 Notification sent:', response);
    return response;
  } catch (error) {
    console.error('❌ FCM error:', error.message);
    return null;
  }
}

/**
 * Parse time string (HH:MM or HH:MM:SS) to minutes since midnight
 */
function parseTime(timeString) {
  if (!timeString) return 0;
  const parts = timeString.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

/**
 * Clean up notifications older than 1 hour
 */
function cleanupOldNotifications() {
  const oneHourAgo = Date.now() - 3600000; // 1 hour

  for (const [key, timestamp] of sentNotifications.entries()) {
    if (timestamp < oneHourAgo) {
      sentNotifications.delete(key);
    }
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    checkClasses();
  });

  console.log('✅ Class notification scheduler started (runs every 2 minutes)');

  // Run immediately on start
  checkClasses();
}

module.exports = { startScheduler };
