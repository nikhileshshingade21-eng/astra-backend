const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', tables.rows.map(x => x.table_name).join(', '));
        
        // Try login manually
        const bcrypt = require('bcryptjs');
        const user = await pool.query("SELECT id, roll_number, password_hash FROM users WHERE roll_number = '25N81A6258'");
        if (user.rows.length > 0) {
            const valid = await bcrypt.compare('nikhilesh', user.rows[0].password_hash);
            console.log('Password valid:', valid);
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}
check();
