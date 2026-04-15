require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const res = await pool.query("SELECT * FROM classes WHERE section = 'CS' LIMIT 1");
        console.log(res.rows[0]);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
})();
