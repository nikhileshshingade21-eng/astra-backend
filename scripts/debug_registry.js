const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Check verified_students for Nikhilesh
        const vs = await pool.query("SELECT * FROM verified_students WHERE roll_number = '25N81A6258'");
        console.log('=== VERIFIED_STUDENTS ===');
        console.log(JSON.stringify(vs.rows, null, 2));

        // Check users table
        const u = await pool.query("SELECT id, roll_number, name, is_registered, device_id, role FROM users WHERE roll_number = '25N81A6258'");
        console.log('\n=== USERS TABLE ===');
        console.log(JSON.stringify(u.rows, null, 2));

        // Check the verified_students schema columns
        const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'verified_students' ORDER BY ordinal_position");
        console.log('\n=== VERIFIED_STUDENTS SCHEMA ===');
        cols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

        // Total count
        const count = await pool.query('SELECT COUNT(*) FROM verified_students');
        console.log('\nTotal verified_students:', count.rows[0].count);

        await pool.end();
    } catch (e) {
        console.error('ERROR:', e.message);
        await pool.end();
    }
})();
