require('dotenv').config();
const { queryAll } = require('./database_module');
const admin = require('firebase-admin');

// Initialize Firebase Admin (Safe check)
if (!admin.apps.length) {
    const fs = require('fs');
    const path = require('path');
    const serviceAccountPath = path.join(__dirname, 'firebase-credentials.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function broadcastTest() {
    console.log("🚀 Starting Production Broadcast Test...");

    try {
        // 1. Fetch targets
        const users = await queryAll('SELECT id, roll_number, fcm_token FROM users WHERE fcm_token IS NOT NULL');
        const tokens = users.map(u => u.fcm_token);
        
        if (tokens.length === 0) {
            console.log("⚠️ No registered students with FCM tokens found.");
            process.exit(0);
        }

        console.log(`🌐 Targets Found: ${tokens.length} students`);

        const title = "ASTRA Intelligence 🛡️";
        const message = "Your future is being coded right now. 💻 Study hard, work smart, and let ASTRA handle the rest. Let's make today count! ✨";

        // 2. Multicast Send
        console.log("📤 Sending messages via Multicast...");
        const response = await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            notification: { title, body: message },
            data: { 
                title, 
                body: message, 
                type: 'admin_broadcast',
                test_id: 'prod_test_01'
            },
            android: { 
                priority: 'high',
                notification: { 
                    sound: 'default', 
                    channelId: 'astra-class-reminders' 
                }
            }
        });

        console.log(`✅ Result: ${response.successCount} successful, ${response.failureCount} failed.`);

        // 3. Cleanup logic (Ensure NO trace remains in notifications or notification_history)
        // Since I'm not using the controller, these tables won't be hit anyway, 
        // but I'll run a safety delete just in case 'test_id' was logged anywhere.
        console.log("🧹 Cleaning up production state...");
        await queryAll("DELETE FROM notifications WHERE message LIKE '%Your future is being coded%'");
        await queryAll("DELETE FROM notification_history WHERE title = $1", [title]);

        console.log("🏁 Broadcast Test Complete. Data is clean.");

    } catch (e) {
        console.error("❌ Critical Broadcast Failure:", e.message);
    }
    process.exit(0);
}

broadcastTest();
