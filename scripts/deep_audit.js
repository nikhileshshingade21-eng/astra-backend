const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { queryAll } = require('../database_module.js');

async function deepAudit() {
    console.log("═══════════════════════════════════════════════════");
    console.log("  ASTRA DEEP PRODUCTION AUDIT");
    console.log("  " + new Date().toISOString());
    console.log("═══════════════════════════════════════════════════");
    
    try {
        // ───── 1. HOLIDAY CHECK (isHolidayToday) ─────
        console.log("\n[1/8] HOLIDAY CHECK (isHolidayToday simulation)...");
        const today = new Date().toISOString().split('T')[0];
        try {
            const events = await queryAll(
                "SELECT id FROM academic_calendar WHERE CAST($1 AS DATE) BETWEEN CAST(start_date AS DATE) AND CAST(end_date AS DATE) AND is_system_holiday = 1 LIMIT 1",
                [today]
            );
            console.log("  ✅ Holiday check query WORKS. isHoliday:", events.length > 0);
        } catch (e) {
            console.log("  ❌ HOLIDAY CHECK QUERY BROKEN:", e.message);
            console.log("  → This would silently return false (no crash) but indicates SQL issues");
        }

        // ───── 2. USER_PREFERENCES TABLE ─────
        console.log("\n[2/8] QUIET HOURS CHECK (AIEngine.fallsInQuietHours)...");
        try {
            const prefs = await queryAll("SELECT * FROM user_preferences LIMIT 1");
            console.log("  ✅ user_preferences table exists. Rows:", prefs.length);
        } catch (e) {
            console.log("  ❌ user_preferences TABLE MISSING:", e.message);
            console.log("  → This crashes fallsInQuietHours which is called BEFORE every notification");
        }

        // ───── 3. USER_BEHAVIOR_LOGS TABLE ─────
        console.log("\n[3/8] AI ENGINE TABLES...");
        try {
            const logs = await queryAll("SELECT COUNT(*) as cnt FROM user_behavior_logs");
            console.log("  ✅ user_behavior_logs exists. Rows:", logs[0].cnt);
        } catch (e) {
            console.log("  ❌ user_behavior_logs TABLE MISSING:", e.message);
        }

        // ───── 4. NOTIFICATION_HISTORY TABLE ─────
        console.log("\n[4/8] NOTIFICATION_HISTORY TABLE...");
        try {
            const hist = await queryAll("SELECT COUNT(*) as cnt FROM notification_history");
            console.log("  ✅ notification_history exists. Rows:", hist[0].cnt);
            const lastN = await queryAll("SELECT title, status, sent_at FROM notification_history ORDER BY sent_at DESC LIMIT 3");
            lastN.forEach(n => console.log(`    • [${n.sent_at}] ${n.status}: ${n.title}`));
        } catch (e) {
            console.log("  ❌ notification_history TABLE ISSUE:", e.message);
        }

        // ───── 5. ANNOUNCEMENTS TABLE ─────
        console.log("\n[5/8] ANNOUNCEMENTS TABLE SCHEMA...");
        try {
            const cols = await queryAll("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'announcements' ORDER BY ordinal_position");
            console.log("  Columns:");
            cols.forEach(c => console.log(`    • ${c.column_name} (${c.data_type})`));
        } catch (e) {
            console.log("  ❌ Cannot read announcements schema:", e.message);
        }

        // ───── 6. FCM TOKEN STATUS ─────
        console.log("\n[6/8] FCM TOKEN CHECK...");
        const users = await queryAll("SELECT id, name, roll_number, fcm_token FROM users WHERE roll_number = '25N81A6258'");
        if (users.length > 0) {
            const u = users[0];
            const tokenPreview = u.fcm_token ? u.fcm_token.substring(0, 30) + '...' : 'NULL';
            console.log(`  Student: ${u.name} (${u.roll_number})`);
            console.log(`  FCM Token: ${tokenPreview}`);
            console.log(`  Token Length: ${u.fcm_token ? u.fcm_token.length : 0}`);
        } else {
            console.log("  ❌ Student 25N81A6258 NOT FOUND");
        }

        // ───── 7. FIREBASE STATUS (from prod health) ─────
        console.log("\n[7/8] FIREBASE SERVICE STATUS...");
        try {
            const admin = require('../services/firebaseService');
            const ready = admin.apps.length > 0;
            console.log(`  Firebase Initialized: ${ready}`);
            console.log(`  Apps Count: ${admin.apps.length}`);
            if (ready) {
                console.log("  ✅ Firebase is ready to send FCM messages");
            } else {
                console.log("  ❌ Firebase NOT initialized — ALL push notifications are disabled!");
            }
        } catch (e) {
            console.log("  ❌ Firebase service failed to load:", e.message);
        }

        // ───── 8. ANTI-SPAM CHECK ─────
        console.log("\n[8/8] ANTI-SPAM / DAILY LIMITS ANALYSIS...");
        // Check how many notifications were sent to our target today
        try {
            const todayNots = await queryAll(
                "SELECT COUNT(*) as cnt FROM notifications WHERE user_id = $1 AND created_at >= CURRENT_DATE",
                [users[0]?.id || 11]
            );
            console.log(`  Notifications sent today to target: ${todayNots[0].cnt}`);
            console.log(`  Daily limit: 5`);
            if (parseInt(todayNots[0].cnt) >= 5) {
                console.log("  ⚠️ DAILY LIMIT REACHED — No more notifications will be sent today!");
            } else {
                console.log("  ✅ Under daily limit, notifications should flow.");
            }
        } catch (e) {
            console.log("  ❌ Could not check daily counts:", e.message);
        }

        // ───── SUMMARY ─────
        console.log("\n═══════════════════════════════════════════════════");
        console.log("  AUDIT COMPLETE — Review issues marked with ❌");
        console.log("═══════════════════════════════════════════════════");

    } catch (e) {
        console.error("AUDIT FATAL ERROR:", e.message);
    } finally {
        process.exit(0);
    }
}

deepAudit();
