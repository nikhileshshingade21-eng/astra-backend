require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const res = await pool.query("SELECT DISTINCT day_of_week FROM classes WHERE section = 'CS'");
        console.log("Unique day_of_week for CS:");
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
})();
