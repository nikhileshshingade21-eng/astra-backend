const { Pool } = require('pg');
const p = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});
p.query("UPDATE users SET device_id = NULL WHERE roll_number = '25N81A6258'")
    .then(r => { console.log('Reset device_id. Rows affected:', r.rowCount); return p.end(); })
    .catch(e => { console.error(e.message); p.end(); });
