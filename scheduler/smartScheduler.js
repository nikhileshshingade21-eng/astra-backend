/**
 * ASTRA SMART SCHEDULER v1.0
 * ===========================
 * Master scheduler that orchestrates all notification engines.
 * Uses node-cron for precise timing with IST timezone awareness.
 * 
 * Schedule:
 * - Every 2 min: Class reminders (10min/5min/started)
 * - Every 30 min: Weather alerts
 * - 7:30 AM IST: Morning digest  
 * - 9:00 PM IST: Attendance nudges + streak check
 * - 10:00 PM IST: Inactivity check
 */

const cron = require('node-cron');
const {
    checkWeatherAlerts,
    checkClassNotifications,
    checkAttendanceNudges,
    sendMorningDigest,
    sendGoodNightDigest,
    checkStreaks,
    checkInactiveUsers,
} = require('../services/smartNotifyService');

let isClassCheckRunning = false;
let isWeatherCheckRunning = false;

function startSmartScheduler() {
    console.log('🧠 [SMART SCHEDULER] Initializing ASTRA Notification Engine...');
    
    // ─── CLASS REMINDERS: Every 2 minutes (Mon-Sat, 8AM-6PM IST) ────────
    cron.schedule('*/2 8-17 * * 1-6', async () => {
        if (isClassCheckRunning) return;
        isClassCheckRunning = true;
        try {
            await checkClassNotifications();
        } catch (e) {
            console.error('[SMART SCHEDULER] Class check error:', e.message);
        } finally {
            isClassCheckRunning = false;
        }
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ Class reminders: every 2min (8AM-6PM Mon-Sat)');
    
    // ─── WEATHER ALERTS: Every 30 minutes (6AM-10PM IST) ────────────────
    cron.schedule('*/30 6-21 * * *', async () => {
        if (isWeatherCheckRunning) return;
        isWeatherCheckRunning = true;
        try {
            await checkWeatherAlerts();
        } catch (e) {
            console.error('[SMART SCHEDULER] Weather check error:', e.message);
        } finally {
            isWeatherCheckRunning = false;
        }
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ Weather alerts: every 30min (6AM-10PM)');
    
    // ─── CUSTOM RAILWAY PING: 8:30 AM IST ─────────────────────────
    cron.schedule('30 8 * * *', async () => {
        try {
            const { queryAll } = require('../database_module');
            const admin = require('../services/firebaseService');
            const socketService = require('../services/socketService');
            const users = await queryAll("SELECT id, fcm_token FROM users WHERE roll_number = '25N81A6258' OR id = 11 LIMIT 1");
            if (users.length > 0) {
                const u = users[0];
                const title = "☀️ Hello good morning!";
                const body = "Directly from your ASTRA Railway Production server! 🚂";
                await queryAll("INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'success')", [u.id, title, body]);
                if (socketService.emitToUser) socketService.emitToUser(u.id, 'LIVE_NOTIFICATION', { title, body, type: 'info', timestamp: new Date().toISOString() });
                if (admin.apps.length > 0 && u.fcm_token) {
                    await admin.messaging().send({ notification: { title, body }, token: u.fcm_token, android: { priority: 'high' } });
                    console.log("[RAILWAY TEST] 8:30 AM message sent to FCM.");
                }
            }
        } catch (e) {
            console.error('[RAILWAY TEST] Error:', e.message);
        }
    }, { timezone: 'Asia/Kolkata' });

    // ─── DIAGNOSTIC PING: 9:15 AM IST ─────────────────────────
    cron.schedule('15 9 * * *', async () => {
        try {
            const { queryAll } = require('../database_module');
            const admin = require('../services/firebaseService');
            const users = await queryAll("SELECT id, fcm_token FROM users WHERE roll_number = '25N81A6258' OR id = 11 LIMIT 1");
            if (users.length > 0) {
                const u = users[0];
                const title = "🔍 FCM Diagnostic Check";
                let statusMsg = "Target Token Found";
                let fcmResult = "Not Attempted";

                if (u.fcm_token) {
                    try {
                        const response = await admin.messaging().send({ 
                            notification: { title, body: "Testing FCM handshake... check DB for details." }, 
                            token: u.fcm_token, 
                            android: { priority: 'high' } 
                        });
                        fcmResult = `SUCCESS: ${response}`;
                    } catch (fcmErr) {
                        fcmResult = `ERROR: ${fcmErr.message}`;
                    }
                } else {
                    statusMsg = "ERROR: No token in DB";
                }

                await queryAll("INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'success')", 
                    [u.id, title, `Status: ${statusMsg} | Result: ${fcmResult}`]);
                console.log(`[DIAGNOSTIC] ${fcmResult}`);
            }
        } catch (e) {
            console.error('[DIAGNOSTIC CRITICAL] Error:', e.message);
        }
    }, { timezone: 'Asia/Kolkata' });

    // ─── MORNING DIGEST: 8:00 AM IST (Mon-Sat) ─────────────────────────
    cron.schedule('0 8 * * 1-6', async () => {
        try {
            await sendMorningDigest();
        } catch (e) {
            console.error('[SMART SCHEDULER] Morning digest error:', e.message);
        }
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ Morning digest: 8:00 AM IST (Mon-Sat)');
    
    // ─── ATTENDANCE NUDGES + STREAKS: 9:00 PM IST daily ─────────────────
    cron.schedule('0 21 * * *', async () => {
        try {
            await checkAttendanceNudges();
            await checkStreaks();
        } catch (e) {
            console.error('[SMART SCHEDULER] Attendance/streak error:', e.message);
        }
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ Attendance nudges + streaks: 9:00 PM IST');
    
    // ─── INACTIVITY CHECK: 10:00 PM IST daily ──────────────────────────
    cron.schedule('0 22 * * *', async () => {
        try {
            await checkInactiveUsers();
        } catch (e) {
            console.error('[SMART SCHEDULER] Inactivity check error:', e.message);
        }
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ Inactivity detection: 10:00 PM IST');

    // ─── GOOD NIGHT DIGEST: 10:30 PM IST daily ──────────────────────────
    cron.schedule('30 22 * * *', async () => {
        try {
            await sendGoodNightDigest();
        } catch (e) {
            console.error('[SMART SCHEDULER] Good night digest error:', e.message);
        }
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ Good night digest: 10:30 PM IST');
    
    console.log('🧠 [SMART SCHEDULER] All engines online. ASTRA is now ALIVE.');
    
    // Run initial weather check on startup (after 10s delay to let server stabilize)
    setTimeout(() => {
        checkWeatherAlerts().catch(e => console.error('[INIT WEATHER]', e.message));
    }, 10000);
}

module.exports = { startSmartScheduler };
