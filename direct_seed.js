const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    try {
        // 1. Check user profile
        const users = await pool.query("SELECT id, name, programme, section, role FROM users");
        console.log('ALL USERS:');
        users.rows.forEach(u => console.log(`  id=${u.id} name=${u.name} prog=${u.programme} sec=${u.section} role=${u.role}`));

        // 2. Check existing classes
        const existing = await pool.query("SELECT * FROM classes WHERE day = 'Tuesday'");
        console.log('\nEXISTING TUESDAY CLASSES:', existing.rows.length);
        existing.rows.forEach(c => console.log(`  ${c.name} | prog=${c.programme} sec=${c.section}`));

        // 3. Check what programme/section the user has
        const nikhilesh = users.rows.find(u => u.name && u.name.toLowerCase().includes('nikhilesh'));
        if (nikhilesh) {
            console.log(`\nNikhilesh profile: prog="${nikhilesh.programme}" sec="${nikhilesh.section}"`);
        } else {
            console.log('\nWARNING: No user with name Nikhilesh found!');
            // Show all users for debugging
        }

        // 4. Now seed classes matching EXACTLY the user's programme & section
        const prog = nikhilesh ? nikhilesh.programme : 'B.Tech CSC';
        const sec = nikhilesh ? nikhilesh.section : 'CS';
        
        console.log(`\nSeeding Tuesday classes for prog="${prog}" sec="${sec}"`);
        
        // Delete old Tuesday classes for this section
        await pool.query("DELETE FROM classes WHERE day = 'Tuesday' AND section = $1", [sec]);
        
        const classes = [
            ['CS101', 'Data Structures', 'Dr. Sharma', 'L-101', '09:30 AM', '10:30 AM'],
            ['CS102', 'Python Lab', 'Prof. Rao', 'Lab-2', '10:30 AM', '12:30 PM'],
            ['CS103', 'Mathematics III', 'Dr. Reddy', 'L-102', '01:30 PM', '02:30 PM'],
            ['CS104', 'OS Principles', 'Dr. Verma', 'L-103', '02:30 PM', '03:30 PM'],
            ['CS105', 'Digital Electronics', 'Prof. Kumar', 'L-104', '03:30 PM', '04:30 PM']
        ];

        for (const [code, name, faculty, room, start, end] of classes) {
            await pool.query(
                `INSERT INTO classes (code, name, faculty_name, room, start_time, end_time, day, programme, section)
                 VALUES ($1, $2, $3, $4, $5, $6, 'Tuesday', $7, $8)`,
                [code, name, faculty, room, start, end, prog, sec]
            );
        }
        
        // 5. Verify
        const verify = await pool.query("SELECT name, programme, section FROM classes WHERE day = 'Tuesday' AND section = $1", [sec]);
        console.log(`\nVERIFICATION: ${verify.rows.length} Tuesday classes seeded:`);
        verify.rows.forEach(c => console.log(`  ✅ ${c.name} (prog=${c.programme}, sec=${c.section})`));

        console.log('\n🎉 DONE! Classes are now in the database.');
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

seed();
