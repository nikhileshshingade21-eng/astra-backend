const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { queryAll } = require('../database_module.js');

async function monitor() {
    console.log(`📊 ASTRA Live Monitor [${new Date().toISOString()}]`);
    
    try {
        // 1. Check for Wednesday (Yesterday's) cleanup/history
        // 2. Check for Thursday (Today's) upcoming events
        const userRes = await queryAll("SELECT id, name FROM users WHERE roll_number = '25N81A6258'");
        const student = userRes[0];
        
        // 3. New notifications sent in the last 15 minutes
        const recent = await queryAll(`
            SELECT title, status, sent_at 
            FROM notification_history 
            WHERE sent_at > NOW() - INTERVAL '15 minutes'
            ORDER BY sent_at DESC
        `);

        if (recent.length > 0) {
            console.log("\n⚡ NEW ACTIVITY DETECTED:");
            recent.forEach(r => console.log(`  • [${r.sent_at}] ${r.status.toUpperCase()}: ${r.title}`));
        } else {
            console.log("\n💤 No new notifications in the last 15 minutes.");
        }

        // 4. Check for upcoming Morning Digest window
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        
        console.log(`\n🕒 Current IST: ${istTime.getUTCHours().toString().padStart(2, '0')}:${istTime.getUTCMinutes().toString().padStart(2, '0')}`);
        
        if (istTime.getUTCHours() === 7 && istTime.getUTCMinutes() >= 55) {
            console.log("🎯 APPROACHING DIGEST WINDOW (08:00 AM IST)");
        }

    } catch (e) {
        console.error("Monitor Error:", e.message);
    } finally {
        process.exit(0);
    }
}

monitor();
