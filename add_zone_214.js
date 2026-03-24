require('dotenv').config();
const { Client } = require('pg');

async function addZone() {
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
        const sql = "INSERT INTO campus_zones (name, lat, lng, radius_m) VALUES ($1, $2, $3, $4)";
        await client.query(sql, ['Class 214', 17.282100, 78.553165, 50]);
        console.log('✅ Class 214 Zone Added Successfully!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}
addZone();
