const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function diag() {
    try {
        console.log('--- USER PROFILE CHECK ---');
        const userRes = await pool.query("SELECT id, name, programme, section FROM users WHERE name ILIKE '%nikhilesh%'");
        console.table(userRes.rows);

        if (userRes.rows.length === 0) {
            console.log('User nikhilesh not found.');
            return;
        }

        const { programme, section } = userRes.rows[0];
        console.log(`--- TIMETABLE CHECK FOR: ${programme} / ${section} ---`);
        const ttRes = await pool.query(
            "SELECT day, code, name FROM classes WHERE programme = $1 AND section = $2 ORDER BY day LIMIT 5",
            [programme, section]
        );
        console.table(ttRes.rows);
        
        const countRes = await pool.query(
            "SELECT COUNT(*) FROM classes WHERE programme = $1 AND section = $2",
            [programme, section]
        );
        console.log(`Total classes found: ${countRes.rows[0].count}`);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
diag();
