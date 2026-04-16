require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

async function sendTestPush() {
    // 1. Initialize Firebase with local credentials
    const credPath = path.join(__dirname, 'firebase-credentials.json');
    const serviceAccount = require(credPath);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const token = 'cyCTOTMpT0S2dP04_hEv1m:APA91bFAZEaQ9d01aJXcP_Ue7bZf9VKtbCcUazUFtpHWPpSqMvLgxBGl_hULqDRUb46BHPqVZHVWh5hMbjZI6gcfWDtA5qpUkV00-PtVARFocfWxhwC9cDo';
    
    console.log("🚀 Sending Live Test Notification to your phone...");

    try {
        const response = await admin.messaging().send({
            notification: {
                title: '🔔 ASTRA System Test',
                body: 'Direct push from Production. This should pop up on your screen! 🚀'
            },
            data: {
                title: '🔔 ASTRA System Test',
                body: 'Direct push from Production. This should pop up on your screen! 🚀',
                type: 'system_test'
            },
            token: token,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'astra-class-reminders', // Standardized ID
                    priority: 'high',
                }
            }
        });
        console.log("✅ SUCCESS! Notification sent. Message ID:", response);
    } catch (e) {
        console.error("❌ FAILED:", e.message);
    }
    
    process.exit(0);
}

sendTestPush();
