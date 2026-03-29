/**
 * ASTRA Class Notification Scheduler
 * Place this file at: scheduler/classNotifier.js in your Railway backend
 */

const cron = require('node-cron');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// In-memory cache for sent notifications
const sentNotifications = new Map();

/**
 * Check for upcoming and ongoing classes
 */
async function checkClasses(db) {
  try {
    console.log('🔍 Checking for upcoming classes...');

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata', // CHANGE THIS TO YOUR TIMEZONE
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];

    console.log(`📅 Current time: ${currentTime}, Day: ${currentDay}`);

    // Fetch all users with timetables and FCM tokens
    const users = await db.collection('users').find({ 
      fcm_token: { $exists: true },
      timetable: { $exists: true } 
    }).toArray();

    let notificationCount = 0;

    for (const user of users) {
      const { timetable, fcm_token, email } = user;

      if (!fcm_token || !timetable || !timetable[currentDay]) continue;

      const todayClasses = timetable[currentDay];

      for (const classInfo of todayClasses) {
        const { subject, start_time, room } = classInfo;

        if (!start_time) continue;

        const classStart = parseTime(start_time);
        const nowMinutes = parseTime(currentTime);
        const minutesUntilClass = classStart - nowMinutes;

        // SCENARIO 1: Class starting in 10-15 minutes (reminder)
        if (minutesUntilClass >= 10 && minutesUntilClass <= 15) {
          const notificationKey = `${user._id}_${subject}_${start_time}_reminder`;

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
          const notificationKey = `${user._id}_${subject}_${start_time}_start`;

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
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
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
function startScheduler(db) {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    checkClasses(db);
  });

  console.log('✅ Class notification scheduler started (runs every 2 minutes)');

  // Run immediately on start
  checkClasses(db);
}

module.exports = { startScheduler };
