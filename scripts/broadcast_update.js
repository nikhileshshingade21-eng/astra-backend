/**
 * 🚀 ASTRA Global Update Broadcast
 * 
 * Sends a push notification to ALL users notifying them of the new v3.2.4 update.
 * This script runs independently and uses the direct Firebase service.
 */

require('dotenv').config();
const { getDb, queryAll } = require('../database_module.js');
const admin = require('../services/firebaseService');
const AIEngine = require('../services/aiNotificationEngine');

async function broadcastUpdate() {
    console.log('🚀 Starting Global Update Broadcast...');

    try {
        // 1. Fetch all valid FCM tokens
        const users = await queryAll('SELECT id, fcm_token, name FROM users WHERE fcm_token IS NOT NULL');
        
        if (users.length === 0) {
            console.log('❌ No users with FCM tokens found. Aborting.');
            process.exit(0);
        }

        const tokens = users.map(u => u.fcm_token);
        const userIds = users.map(u => u.id);
        
        console.log(`📡 Found ${tokens.length} target devices.`);

        // 2. Prepare payload
        const title = "New Update Available 🚀";
        const body = "Version 3.2.4 is live! Includes fixes for Bunk Calculator and Dashboard. Tap to update.";
        const payload = {
            tokens: tokens,
            notification: { title, body },
            data: { 
                title, 
                body, 
                type: 'admin_broadcast', 
                template: 'update_alert' 
            },
            android: { 
                priority: 'high',
                notification: { 
                    sound: 'default', 
                    channelId: 'astra-class-reminders',
                    color: '#00f2ff'
                }
            }
        };

        // 3. Send via Firebase
        console.log('📤 Sending push notifications...');
        const fcmRes = await admin.messaging().sendEachForMulticast(payload);

        console.log(`✅ Result: ${fcmRes.successCount} sent, ${fcmRes.failureCount} failed.`);

        // 4. Log to history
        console.log('📝 Logging to notification history...');
        for (let i = 0; i < userIds.length; i++) {
            const state = fcmRes.responses[i].success ? 'delivered' : 'failed';
            try {
                await AIEngine.logNotificationHistory(userIds[i], 'admin_broadcast', title, body, state);
            } catch (e) {
                // Ignore single log failures
            }
        }

        console.log('✨ Broadcast Complete.');
    } catch (err) {
        console.error('🔥 CRITICAL ERROR during broadcast:', err.message);
    } finally {
        process.exit(0);
    }
}

broadcastUpdate();
