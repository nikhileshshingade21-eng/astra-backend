const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const u = await pool.query("SELECT * FROM users WHERE roll_number='25N81A6258'");
        console.log('User status after retry:', JSON.stringify(u.rows[0], null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
})();
