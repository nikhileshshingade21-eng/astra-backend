/**
 * ASTRA SMART SCHEDULER v2.0 (V4 Architecture)
 * ===============================================
 * Master scheduler that orchestrates all notification engines.
 * Uses node-cron for precise timing with IST timezone awareness.
 * 
 * V4 Additions:
 * - Overdue-user sweeper (Calculate Now, Sweep Later)
 * - Nightly persona reclassification
 * - Location buffer flush
 *
 * Schedule:
 * - Every 1 min: V4 Overdue user sweep (8AM-9PM Mon-Sat)
 * - Every 2 min: Class reminders (10min/5min/started)
 * - Every 30 min: Weather alerts
 * - 7:30 AM IST: Morning digest  
 * - 9:00 PM IST: Attendance nudges + streak check
 * - 10:00 PM IST: Inactivity check + persona reclassification
 */

const cron = require('node-cron');
const { queryAll } = require('../database_module');
const {
    checkWeatherAlerts,
    checkClassNotifications,
    checkAttendanceNudges,
    sendMorningDigest,
    sendGoodNightDigest,
    checkStreaks,
    checkInactiveUsers,
    sendOverdueNotifications,
} = require('../services/smartNotifyService');

let isClassCheckRunning = false;
let isWeatherCheckRunning = false;
let isSweeperRunning = false;

// ─── V4: OVERDUE USER SWEEPER ───────────────────────────────────────────────
// This is the core of "Calculate Now, Sweep Later":
// Instead of polling ALL users, we only query users where expected_return < NOW()
// This B-Tree indexed query is O(log n) and handles 10,000+ users effortlessly.

async function sweepOverdueUsers() {
    if (isSweeperRunning) return;
    isSweeperRunning = true;

    try {
        // Fast B-Tree indexed query — only fetches overdue users
        const overdueUsers = await queryAll(`
            SELECT id, risk_persona, expected_return, risk_score
            FROM users
            WHERE is_online = true
              AND expected_return IS NOT NULL
              AND expected_return < NOW()
            ORDER BY expected_return ASC
            LIMIT 100
        `);

        if (overdueUsers.length === 0) return;

        console.log(`[V4 SWEEPER] Found ${overdueUsers.length} overdue users. Processing...`);

        // Send persona-aware notifications in batch
        const sent = await sendOverdueNotifications(overdueUsers);

        if (sent > 0) {
            console.log(`[V4 SWEEPER] Sweep complete: ${sent} notifications dispatched.`);
        }
    } catch (err) {
        console.error('[V4 SWEEPER] Sweep failed:', err.message);
    } finally {
        isSweeperRunning = false;
    }
}

// ─── V4: NIGHTLY PERSONA RECLASSIFICATION ───────────────────────────────────

async function reclassifyAllPersonas() {
    try {
        const personaEngine = require('../services/personaEngine');
        const count = await personaEngine.reclassifyAllPersonas();
        console.log(`[V4 PERSONAS] Nightly reclassification complete: ${count} students updated.`);
    } catch (err) {
        console.error('[V4 PERSONAS] Nightly reclassification failed:', err.message);
    }
}

// ─── V4: LOCATION BUFFER FLUSH ─────────────────────────────────────────────

async function flushLocationPings() {
    try {
        const { flushLocationBuffer } = require('../services/debounceService');
        const entries = flushLocationBuffer();
        if (entries.length === 0) return;

        // Batch update last_active_at for all pinged users
        for (const entry of entries) {
            await queryAll(
                'UPDATE users SET last_active_at = NOW(), is_online = true WHERE id = $1',
                [entry.userId]
            ).catch(() => {}); // Non-critical — silent fail
        }

        console.log(`[V4 FLUSH] Flushed ${entries.length} buffered location pings.`);
    } catch (err) {
        console.error('[V4 FLUSH] Location flush failed:', err.message);
    }
}

function startSmartScheduler() {
    console.log('🧠 [SMART SCHEDULER v2.0] Initializing ASTRA V4 Notification Engine...');
    
    // ─── V4: OVERDUE USER SWEEPER: Every 1 min (Mon-Sat, 8AM-9PM IST) ──
    cron.schedule('* 8-20 * * 1-6', async () => {
        await sweepOverdueUsers();
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ V4 Overdue sweeper: every 1min (8AM-9PM Mon-Sat)');

    // ─── V4: LOCATION BUFFER FLUSH: Every 2 min ────────────────────────
    cron.schedule('*/2 * * * *', async () => {
        await flushLocationPings();
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ V4 Location buffer flush: every 2min');

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
    
    // ─── INACTIVITY CHECK + V4 PERSONA RECLASSIFICATION: 10:00 PM IST ──
    cron.schedule('0 22 * * *', async () => {
        try {
            await checkInactiveUsers();
            await reclassifyAllPersonas(); // V4: Nightly persona update
        } catch (e) {
            console.error('[SMART SCHEDULER] Inactivity/persona error:', e.message);
        }
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ Inactivity detection + V4 persona reclassification: 10:00 PM IST');

    // ─── GOOD NIGHT DIGEST: 10:30 PM IST daily ──────────────────────────
    cron.schedule('30 22 * * *', async () => {
        try {
            await sendGoodNightDigest();
        } catch (e) {
            console.error('[SMART SCHEDULER] Good night digest error:', e.message);
        }
    }, { timezone: 'Asia/Kolkata' });
    console.log('  ✅ Good night digest: 10:30 PM IST');
    
    console.log('🧠 [SMART SCHEDULER v2.0] All V4 engines online. ASTRA is now ALIVE.');
    
    // Run initial weather check on startup (after 10s delay to let server stabilize)
    setTimeout(() => {
        checkWeatherAlerts().catch(e => console.error('[INIT WEATHER]', e.message));
    }, 10000);
}

module.exports = { startSmartScheduler, sweepOverdueUsers };

