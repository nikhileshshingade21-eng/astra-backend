const { Pool } = require('pg');
require('dotenv').config();

async function dump() {
    let connectionStr = process.env.DATABASE_URL;
    if (!connectionStr && process.env.DB_HOST) {
        connectionStr = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    }
    const pool = new Pool({
        connectionString: connectionStr
    });

    try {
        console.log('--- Dumping Classes for Section CS ---');
        const res = await pool.query("SELECT * FROM classes WHERE section = 'CS' ORDER BY day, start_time");
        console.table(res.rows.map(r => ({
            day: r.day,
            code: r.code,
            prog: r.programme,
            sect: r.section,
            start: r.start_time
        })));
        
        console.log('--- Total Classes: ' + res.rows.length);
        
        const userRes = await pool.query("SELECT roll_number, programme, section FROM users WHERE section ILIKE '%CS%' LIMIT 10");
        console.log('--- Sample Users in CS ---');
        console.table(userRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
dump();
