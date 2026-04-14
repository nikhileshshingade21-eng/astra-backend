require('dotenv').config();
const { queryAll } = require('./database_module');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');


async function sendHolidayNotification() {
    try {
        const targetId = '25N81A6258';
        console.log(`Looking up user with ID/Roll Number: ${targetId}`);
        
        // Find user by roll_number or generic id matching
        const users = await queryAll('SELECT id, fcm_token FROM users WHERE roll_number = $1 OR email LIKE $2', [targetId, `${targetId}%`]);
        
        if (users.length === 0) {
            console.log('❌ User not found in database.');
            process.exit(1);
        }
        
        const user = users[0];
        console.log(`Found user! FCM Token exists: ${!!user.fcm_token}`);
        
        if (!user.fcm_token) {
            console.log('❌ User does not have a registered FCM token for push notifications.');
            process.exit(1);
        }

        const credPath = path.join(__dirname, 'firebase-credentials.json');
        if (fs.existsSync(credPath)) {
            const serviceAccount = require(credPath);
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();
            
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
            console.log('✅ Firebase Admin initialized. Sending notification...');
            
            const message = {
                notification: {
                    title: '🎊 Holiday Alert!',
                    body: 'Today is a scheduled institutional holiday as per the Academic Calendar. Instruction is suspended. Enjoy your free day!'
                },
                data: {
                    type: 'calendar_alert',
                    screen: 'AcademicCalendar'
                },
                token: user.fcm_token,
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'astra-class-reminders',
                    },
                }
            };
            
            const response = await admin.messaging().send(message);
            console.log('✅ Successfully triggered push notification:', response);
            
            // Also send a live socket notification if they are currently inside the app
            try {
                const socketService = require('./services/socketService');
                socketService.emitToUser(user.id, 'LIVE_NOTIFICATION', {
                    title: '🎊 Holiday Alert!',
                    body: 'Today is a scheduled institutional holiday. Instruction is suspended.',
                    type: 'calendar_alert'
                });
                console.log('✅ Dispatched live in-app socket fallback check.');
            } catch (e) {
                // Ignore socket error if it's not initialized
            }

        } else {
            console.log('❌ No firebase-credentials.json file found.');
        }
        process.exit(0);
    } catch (e) {
        console.error('❌ Fatal Error:', e);
        process.exit(1);
    }
}

sendHolidayNotification();
