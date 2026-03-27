const { Pool } = require('pg');
require('dotenv').config();

async function check() {
    let connectionStr = process.env.DATABASE_URL;
    if (!connectionStr && process.env.DB_HOST) {
        connectionStr = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    }
    const pool = new Pool({
        connectionString: connectionStr
    });

    try {
        const res = await pool.query("SELECT day, LENGTH(day) as len FROM classes WHERE section = 'CS' LIMIT 1");
        if (res.rows.length > 0) {
            const day = res.rows[0].day;
            console.log('Day String:', day);
            console.log('Length:', res.rows[0].len);
            for (let i = 0; i < day.length; i++) {
                console.log(`Char ${i}: ${day[i]} (code: ${day.charCodeAt(i)})`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
