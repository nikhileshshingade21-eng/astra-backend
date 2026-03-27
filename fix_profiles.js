require('dotenv').config();
const { queryAll } = require('./database_module');

async function fixProfiles() {
    console.log('--- ASTRA Profile Repair Utility ---');
    
    // Find students with CS roll numbers but missing/wrong programme or section
    const students = await queryAll("SELECT id, roll_number, programme, section FROM users WHERE role = 'student' AND roll_number LIKE '25N81A62%'");
    
    if (!students || students.length === 0) {
        console.log('No CS students found in DB.');
        return;
    }

    let fixedCount = 0;
    for (const row of students) {
        const id = row.id;
        const prog = row.programme;
        const sect = row.section;

        if (prog !== 'B.Tech CSC' || sect !== 'CS') {
            await queryAll("UPDATE users SET programme = $1, section = $2 WHERE id = $3", ['B.Tech CSC', 'CS', id]);
            fixedCount++;
        }
    }

    if (fixedCount > 0) {
        console.log(`Successfully repaired ${fixedCount} student profiles to 'B.Tech CSC' / 'CS'.`);
    } else {
        console.log('All CS student profiles are already correct.');
    }
}

fixProfiles().catch(console.error);
