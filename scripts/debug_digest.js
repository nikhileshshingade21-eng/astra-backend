const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { queryAll } = require('../database_module.js');

async function debugDigestFailure() {
    console.log("🛠️ ASTRA POST-MORTEM: 08:00 AM DIGEST FAILURE (" + new Date().toISOString() + ")");
    
    try {
        // 1. Check if any announcements were created today
        const anns = await queryAll(`
            SELECT id, title, created_at, section 
            FROM announcements 
            WHERE created_at >= CURRENT_DATE
        `);
        console.log(`\n📢 Announcements today: ${anns.length}`);
        anns.forEach(a => console.log(`  • [${a.created_at}] ${a.title} (Section: ${a.section})`));

        // 2. Check if any notifications were created today
        const nots = await queryAll(`
            SELECT id, title, created_at, user_id 
            FROM notifications 
            WHERE created_at >= CURRENT_DATE AND title LIKE '%ASTRA Daily Briefing%'
        `);
        console.log(`\n📱 Morning Digest Notifications today: ${nots.length}`);
        nots.forEach(n => console.log(`  • [${n.created_at}] To User ID: ${n.user_id}`));

        // 3. Verify target student actually has classes today (Thursday)
        const day = 'Thursday';
        const targetRoll = '25N81A6258';
        const user = await queryAll("SELECT id, programme, section FROM users WHERE roll_number = $1", [targetRoll]);
        
        if (user.length > 0) {
            const u = user[0];
            const classes = await queryAll(`
                SELECT name, start_time FROM classes 
                WHERE programme = $1 AND section = $2 AND day = $3
            `, [u.programme, u.section, day]);
            
            console.log(`\n📅 Target Schedule (${day}): ${classes.length} classes found.`);
            
            // 4. Check if a Group exists for this student
            const groups = await queryAll(`
                SELECT DISTINCT programme, section FROM classes WHERE day = $1
            `, [day]);
            const hasGroup = groups.some(g => g.programme === u.programme && g.section === u.section);
            console.log(`🔍 Group Discovery: ${hasGroup ? 'SUCCESS' : 'FAILURE'} (Student group ${u.programme}/${u.section} found in Thursday classes)`);
        }

        // 5. Check for Admin users (required for digest announcement creation)
        const admins = await queryAll("SELECT id, name FROM users WHERE role = 'admin'");
        console.log(`\n👨‍💼 Admin Users: ${admins.length}`);
        admins.forEach(a => console.log(`  • ID ${a.id}: ${a.name}`));

    } catch (e) {
        console.error("❌ Debug script failed:", e.message);
    } finally {
        process.exit(0);
    }
}

debugDigestFailure();
