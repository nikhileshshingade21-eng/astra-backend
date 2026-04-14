/**
 * ASTRA Test Notifier — Manually trigger a push notification for a specific user.
 * Usage: node scripts/test-notifier.js [roll_number]
 */
require('dotenv').config();
const { Pool } = require('pg');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const roll = process.argv[2] || '25N81A6258';

// Firebase init
const credPath = path.join(__dirname, '..', 'firebase-credentials.json');
let serviceAccount;
if (fs.existsSync(credPath)) {
    serviceAccount = require(credPath);
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} else {
    console.error('❌ No Firebase credentials found');
    process.exit(1);
}

if (serviceAccount?.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
        `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const res = await pool.query(
            'SELECT id, name, fcm_token FROM users WHERE roll_number = $1',
            [roll.toUpperCase()]
        );

        if (res.rows.length === 0) {
            console.error(`❌ User ${roll} not found`);
            process.exit(1);
        }

        const user = res.rows[0];
        console.log(`\n📋 User: ${user.name} (ID: ${user.id})`);
        console.log(`📱 FCM Token: ${user.fcm_token ? user.fcm_token.substring(0, 30) + '...' : '❌ NONE'}`);

        if (!user.fcm_token) {
            console.error('\n❌ No FCM token stored. User needs to log in with the latest app first.');
            process.exit(1);
        }

        // Send test notifications
        const notifications = [
            {
                title: '🌤️ Weather Alert',
                body: 'Today: 34°C, Partly Cloudy. Stay hydrated on campus!',
                data: { type: 'weather', temp: '34' }
            },
            {
                title: '📚 Upcoming: Data Structures',
                body: 'Your class starts in 10 minutes at 10:30 AM in Room 301',
                data: { type: 'class_reminder', class_name: 'Data Structures', room: '301' }
            },
            {
                title: '📊 Attendance Nudge',
                body: 'Your attendance in DBMS is at 72%. Attend today to stay above 75%!',
                data: { type: 'attendance_nudge', subject: 'DBMS', percentage: '72' }
            }
        ];

        for (const notif of notifications) {
            try {
                const msgId = await admin.messaging().send({
                    notification: { title: notif.title, body: notif.body },
                    data: notif.data,
                    token: user.fcm_token,
                    android: {
                        priority: 'high',
                        notification: { sound: 'default', channelId: 'astra-class-reminders' }
                    }
                });
                console.log(`✅ Sent: "${notif.title}" → ${msgId}`);
            } catch (e) {
                console.error(`❌ Failed: "${notif.title}" → ${e.message}`);
            }
        }

        console.log('\n🎯 Test complete!');
        await pool.end();
    } catch (e) {
        console.error('ERROR:', e.message);
        await pool.end();
    }
})();
