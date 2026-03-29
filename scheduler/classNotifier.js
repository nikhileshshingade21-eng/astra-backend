/**
 * ASTRA Class Notification Scheduler (PostgreSQL Version)
 * Optimized for Railway + Supabase.
 */

const cron = require('node-cron');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { queryAll } = require('../database_module');

// Initialize Firebase Admin SDK (supports both file and env variable)
let serviceAccount;
const credPath = path.join(__dirname, '..', 'firebase-credentials.json');

if (fs.existsSync(credPath)) {
  serviceAccount = require(credPath);
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} else {
  console.error('❌ No Firebase credentials found. Scheduler will not start.');
  module.exports = { startScheduler: () => {} };
  return;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// In-memory cache for sent notifications
const sentNotifications = new Map();

/**
 * Check for upcoming and ongoing classes
 */
async function checkClasses() {
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
  }
}

/**
 * Send Firebase Cloud Messaging notification
 */
async function sendNotification(fcmToken, { title, body, data }) {
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
