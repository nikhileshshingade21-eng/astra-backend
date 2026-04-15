require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const res = await pool.query("SELECT * FROM classes WHERE section = 'CS'");
        console.log("Total CS records:", res.rows.length);
        const wed = res.rows.filter(r => r.day === 'Wednesday' || r.day === 'wednesday' || r.day === 'WEDNESDAY');
        console.log("Classes on Wednesday:", wed);
        const mon = res.rows.filter(r => r.day === 'Monday');
        console.log("Classes on Monday (for reference):", mon.length);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
})();
