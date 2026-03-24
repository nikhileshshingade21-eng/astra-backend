require('dotenv').config();
const { Client } = require('pg');

async function checkFailures() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        // Check notifications for attendance-related errors
        const res = await client.query("SELECT * FROM notifications WHERE message LIKE '%ACCESS DENIED%' OR message LIKE '%FAILURE%' ORDER BY created_at DESC LIMIT 10");
        console.log('--- ATTENDANCE FAILURE LOGS ---');
        console.table(res.rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}
checkFailures();
