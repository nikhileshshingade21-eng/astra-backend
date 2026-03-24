const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function checkStrings() {
    try {
        const user = await pool.query("SELECT id, roll_number, name, programme, section, LENGTH(programme) as p_len, LENGTH(section) as s_len FROM users WHERE roll_number = '25N81A6258'");
        console.log('USER DATA:');
        console.log(JSON.stringify(user.rows[0], null, 2));
        
        const classes = await pool.query("SELECT id, name, day, programme, section, LENGTH(programme) as p_len, LENGTH(section) as s_len FROM classes WHERE day = 'Tuesday' LIMIT 5");
        console.log('\nCLASSES DATA:');
        console.log(JSON.stringify(classes.rows, null, 2));
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkStrings();
