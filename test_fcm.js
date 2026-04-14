require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function sendTestPush() {
    // Initialize Firebase
    const credPath = path.join(__dirname, 'firebase-credentials.json');
    const serviceAccount = require(credPath);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();
    
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    
    const fcmToken = 'eVkUBDE2TGaDLBgMptfgUY:APA91bEz664oZVyL0T6jvhxXqnoVXRDwvTztQ1VYNpiwDrSF1dtxqN-VaUyQQ4MYrKaZPdBXCd8_L8h4-h3u7MGa8XDXhpCmM216a7QrehuRbfIl_5NSj5U';
    
    console.log("Sending test push notification...");
    
    try {
        const result = await admin.messaging().send({
            notification: {
                title: '🌙 Good Evening, Nikhilesh!',
                body: 'ASTRA is watching over your campus. Have a great night! ✨'
            },
            data: {
                type: 'test',
                template: 'evening_greeting'
            },
            token: fcmToken,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'astra-class-reminders',
                    priority: 'high',
                }
            }
        });
        console.log("SUCCESS! FCM Message ID:", result);
    } catch (e) {
        console.log("FAILED:", e.code, e.message);
    }
    
    process.exit(0);
}
sendTestPush();
