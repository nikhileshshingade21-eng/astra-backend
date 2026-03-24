const { queryAll } = require('./database_module');
const fs = require('fs');
const path = require('path');

async function syncProductionData() {
    console.log('🚀 Starting Deep System Audit & Sync...');
    
    try {
        // 1. Read Registry Data from SQL file
        const sqlPath = path.join(__dirname, 'scripts', 'seed_verified_students.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('⏳ Executing Institutional Registry Seed...');
        await queryAll(sqlContent);
        console.log('✅ Institutional Registry synced to Production.');

        // 2. Verify specific Student (Audit Case)
        const check = await queryAll('SELECT roll_number, full_name, section FROM verified_students WHERE roll_number = $1', ['25N81A0501']);
        if (check.length > 0) {
            console.log(`🎉 Audit PASSED: ${check[0].roll_number} (${check[0].full_name}) is now VERIFIED.`);
        } else {
            console.error('❌ Audit FAILED: 25N81A0501 not found after sync.');
        }

        // 3. Check Timetable Consistency
        const timetableCount = await queryAll('SELECT COUNT(*) FROM timetable');
        console.log(`📊 Timetable Records: ${timetableCount[0].count}`);

    } catch (err) {
        console.error('❌ Sync Error:', err.message);
    } finally {
        process.exit();
    }
}

syncProductionData();
