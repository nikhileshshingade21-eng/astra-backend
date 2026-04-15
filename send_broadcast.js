require('dotenv').config();
const { queryAll } = require('./database_module');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function sendGoodNightBroadcast() {
    // 1. Initialize Firebase Admin
    const credPath = path.join(__dirname, 'firebase-credentials.json');
    if (!fs.existsSync(credPath)) {
        console.error("No firebase-credentials.json found");
        process.exit(1);
    }
    
    const serviceAccount = require(credPath);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();
    
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    
    try {
        console.log("Fetching registered users...");
        const users = await queryAll("SELECT id, name, roll_number, fcm_token FROM users WHERE fcm_token IS NOT NULL AND fcm_token != ''");
        
        console.log(`Found ${users.length} users with FCM tokens. Starting push notifications...`);
        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            try {
                // Personalize name if available
                const firstName = user.name ? user.name.split(' ')[0] : '';
                const title = firstName ? `🌙 Good Night, ${firstName}!` : `🌙 Good Night!`;
                
                await admin.messaging().send({
                    notification: {
                        title: title,
                        body: 'You crushed it today. ASTRA is going into sleep mode — get some rest and see you tomorrow! ✨'
                    },
                    data: {
                        type: 'broadcast',
                        template: 'good_night'
                    },
                    token: user.fcm_token,
                    android: {
                        priority: 'high',
                        notification: {
                            sound: 'default',
                            channelId: 'astra-class-reminders',
                            priority: 'high',
                        }
                    }
                });
                
                console.log(`✅ Sent to ${user.roll_number}`);
                successCount++;
            } catch (e) {
                console.log(`❌ Failed for ${user.roll_number}: ${e.message}`);
                failCount++;
            }
        }
        
        console.log(`\n🎉 Broadcast complete! Success: ${successCount}, Failed: ${failCount}`);
    } catch (e) {
        console.error("Database query failed:", e.message);
    }
    
    process.exit(0);
}

sendGoodNightBroadcast();
