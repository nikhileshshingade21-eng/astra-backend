const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        // Check user profile
        const user = await pool.query("SELECT id, roll_number, name, programme, section FROM users WHERE roll_number = '25N81A6258'");
        console.log('USER PROFILE:');
        console.log(`  programme: "${user.rows[0].programme}"`);
        console.log(`  section:   "${user.rows[0].section}"`);
        
        // Check what classes exist for Tuesday
        const classes = await pool.query("SELECT DISTINCT programme, section FROM classes WHERE day = 'Tuesday'");
        console.log('\nCLASSES in DB (Tuesday):');
        classes.rows.forEach(c => console.log(`  programme: "${c.programme}" | section: "${c.section}"`));
        
        // Now test the EXACT query the controller runs
        const prog = user.rows[0].programme;
        const sec = user.rows[0].section;
        const result = await pool.query(
            "SELECT name, start_time FROM classes WHERE day = 'Tuesday' AND programme = $1 AND section = $2 ORDER BY start_time",
            [prog, sec]
        );
        console.log(`\nQUERY RESULT (prog="${prog}", sec="${sec}"):`);
        console.log(`  Found: ${result.rows.length} classes`);
        result.rows.forEach(c => console.log(`  ${c.start_time} | ${c.name}`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}
check();
