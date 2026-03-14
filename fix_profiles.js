const { getDb, saveDb, queryAll } = require('./db');

async function fixProfiles() {
    console.log('--- ASTRA Profile Repair Utility ---');
    const db = await getDb();
    
    // Find students with CS roll numbers but missing/wrong programme or section
    const students = queryAll("SELECT id, roll_number, programme, section FROM users WHERE role = 'student' AND roll_number LIKE '25N81A62%'");
    
    if (!students.length || !students[0].values.length) {
        console.log('No CS students found in DB.');
        return;
    }

    let fixedCount = 0;
    for (const row of students[0].values) {
        const id = row[0];
        const prog = row[2];
        const sect = row[3];

        if (prog !== 'B.Tech CSC' || sect !== 'CS') {
            db.run("UPDATE users SET programme = 'B.Tech CSC', section = 'CS' WHERE id = ?", [id]);
            fixedCount++;
        }
    }

    if (fixedCount > 0) {
        saveDb();
        console.log(`Successfully repaired ${fixedCount} student profiles to 'B.Tech CSC' / 'CS'.`);
    } else {
        console.log('All CS student profiles are already correct.');
    }
}

fixProfiles().catch(console.error);
