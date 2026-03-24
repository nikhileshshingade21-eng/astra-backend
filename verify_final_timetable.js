const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        const res = await pool.query(`
            SELECT day, code, name, start_time, end_time 
            FROM classes 
            WHERE programme = 'B.Tech CSC' AND section = 'CS' 
            AND day IN ('Friday', 'Saturday')
            ORDER BY day, start_time
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
verify();
