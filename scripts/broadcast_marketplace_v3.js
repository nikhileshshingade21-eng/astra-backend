require('dotenv').config();
const { getDb, queryAll } = require('../database_module');
const { getMessaging } = require('firebase-admin/messaging');
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin if not already
if (!admin.apps.length) {
    try {
        const credPath = path.join(__dirname, '../firebase-credentials.json');
        const serviceAccount = require(credPath);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[BROADCAST] Firebase Admin SDK Initialized');
    } catch (e) {
        console.error('Failed to parse Firebase credentials:', e.message);
        process.exit(1);
    }
}

async function broadcastUpdate() {
    try {
        console.log('[BROADCAST] Fetching active tokens...');
        
        // Get all users who have an FCM token
        const tokensSql = `SELECT id, name, fcm_token FROM users WHERE fcm_token IS NOT NULL AND fcm_token != ''`;
        const users = await queryAll(tokensSql);
        
        if (users.length === 0) {
            console.log('[BROADCAST] No active devices found to notify.');
            process.exit(0);
        }

        console.log(`[BROADCAST] Found ${users.length} active devices.`);

        // The Payload
        const message = {
            notification: {
                title: 'ASTRA v3.3.5: Marketplace V3 is LIVE! 🛍️',
                body: 'Unlocking P2P Chat, Reactions, and Photo Capture. Complete your campus exchange with ease. Download: https://github.com/nikhileshshingade21-eng/astra-frontend/releases/download/v3.3.5/app-release.apk',
            },
            data: {
                type: 'update_alert',
                url: 'https://github.com/nikhileshshingade21-eng/astra-frontend/releases/download/v3.3.5/app-release.apk'
            },
            android: {
                priority: "high"
            }
        };

        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
             try {
                 const userMsg = {
                     ...message,
                     token: user.fcm_token
                 };
                 await getMessaging().send(userMsg);
                 console.log(`✅ Sent to ${user.name}`);
                 
                 // Save notification in database
                 await queryAll(
                    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                    [user.id, message.notification.title, message.notification.body, 'info']
                 );
                 
                 successCount++;
             } catch (e) {
                 console.error(`❌ Failed for ${user.name}:`, e.message);
                 failCount++;
             }
        }

        console.log('\n================================');
        console.log('MARKETPLACE BROADCAST COMPLETE');
        console.log(`Successfully sent: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        console.log('================================\n');

        process.exit(0);
    } catch (err) {
        console.error('[BROADCAST ERROR]', err);
        process.exit(1);
    }
}

broadcastUpdate();
