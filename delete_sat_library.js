const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query("DELETE FROM classes WHERE day = 'Saturday' AND code = 'LIBRARY' AND section = 'CS'");
        console.log('Deleted Saturday Library successfully!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
