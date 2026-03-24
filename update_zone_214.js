require('dotenv').config();
const { Client } = require('pg');

async function updateZone() {
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
        // Delete old one just to be clean
        await client.query("DELETE FROM campus_zones WHERE name = 'Class 214'");
        
        // Insert new one with high precision
        const sql = "INSERT INTO campus_zones (name, lat, lng, radius_m) VALUES ($1, $2, $3, $4)";
        await client.query(sql, ['Class 214', 17.279279, 78.554300, 15]); // Using 15m radius for GPS stability
        
        console.log('✅ Class 214 High-Precision Zone UPDATED!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}
updateZone();
