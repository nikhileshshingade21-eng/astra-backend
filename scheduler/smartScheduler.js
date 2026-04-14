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
    
    // ─── MORNING DIGEST: 7:30 AM IST (Mon-Sat) ─────────────────────────
    cron.schedule('30 7 * * 1-6', async () => {
        try {
            await sendMorningDigest();
        } catch (e) {
            console.error('[SMART SCHEDULER] Morning digest error:', e.message);
        }
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ Morning digest: 7:30 AM IST (Mon-Sat)');
    
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
    
    console.log('🧠 [SMART SCHEDULER] All engines online. ASTRA is now ALIVE.');
    
    // Run initial weather check on startup (after 10s delay to let server stabilize)
    setTimeout(() => {
        checkWeatherAlerts().catch(e => console.error('[INIT WEATHER]', e.message));
    }, 10000);
}

module.exports = { startSmartScheduler };
