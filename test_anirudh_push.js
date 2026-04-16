require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

async function sendTestPush() {
    // 1. Initialize Firebase
    const credPath = path.join(__dirname, 'firebase-credentials.json');
    const serviceAccount = require(credPath);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    // TARGET: Cherala Anirudh sai (25N81A6243)
    const token = 'dxZSj0FtQ4SodyVM5i-LWj:APA91bEPfxWMWe3_uO6Ib3JFt4uozBxXTxwhBD9JLPUbPqUqKpc5SE42NOhuOJQydUZKva9OQh2ZYZQ6gMwUs62ZJ2YpFcz4Km9LMVMvIn_h3dFb6BCk1jE';
    
    console.log("🚀 Sending Live Test Notification to Anirudh (25N81A6243)...");

    try {
        const response = await admin.messaging().send({
            notification: {
                title: '⚡ ASTRA Connection Success',
                body: 'Anirudh! You are now fully connected to the ASTRA Intelli-Grid. 🚀'
            },
            data: {
                title: '⚡ ASTRA Connection Success',
                body: 'Anirudh! You are now fully connected to the ASTRA Intelli-Grid. 🚀',
                type: 'system_test'
            },
            token: token,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'astra-class-reminders',
                    priority: 'high',
                }
            }
        });
        console.log("✅ SUCCESS! Notification sent to Anirudh. Message ID:", response);
    } catch (e) {
        console.error("❌ FAILED:", e.message);
    }
    
    process.exit(0);
}

sendTestPush();
