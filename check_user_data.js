const { Pool } = require('pg');
require('dotenv').config();

async function check() {
    let connectionStr = process.env.DATABASE_URL;
    const pool = new Pool({
        connectionString: connectionStr
    });

    try {
        const res = await pool.query("SELECT username, programme, section FROM users LIMIT 10");
        console.log('--- User Data ---');
        console.table(res.rows);

        const classes = await pool.query("SELECT DISTINCT programme, section FROM classes");
        console.log('--- Class Groups in DB ---');
        console.table(classes.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
