const { Pool } = require('pg');
require('dotenv').config();

let connectionStr = process.env.DATABASE_URL?.replace(/\n|\r/g, '').trim();
if (!connectionStr && process.env.DB_HOST) {
    connectionStr = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
}

const pool = new Pool({
    connectionString: connectionStr,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const SEARCH_ROLL = '25N81A6256';
        console.log(`Checking user: ${SEARCH_ROLL}`);

        const verified = await pool.query(
            "SELECT * FROM verified_students WHERE roll_number = $1",
            [SEARCH_ROLL]
        );
        console.log('\n=== Verified Registry ===');
        console.log(verified.rows);

        const users = await pool.query(
            "SELECT id, roll_number, name, is_registered, device_id FROM users WHERE roll_number = $1",
            [SEARCH_ROLL]
        );
        console.log('\n=== Registered Users ===');
        console.log(users.rows);

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
})();
