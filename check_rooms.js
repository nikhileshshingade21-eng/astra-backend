require('dotenv').config();
const { Client } = require('pg');

async function checkRooms() {
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
        const res = await client.query('SELECT DISTINCT room FROM classes ORDER BY room');
        console.log('--- CLASSROOMS IN TIMETABLE ---');
        console.table(res.rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}
checkRooms();
