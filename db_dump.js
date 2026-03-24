require('dotenv').config();
const { Client } = require('pg');

async function dumpDb() {
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
        
        console.log('\n--- 👥 USERS (Sample) ---');
        const users = await client.query("SELECT id, roll_number, name, role, programme, section FROM users LIMIT 5");
        console.table(users.rows);

        console.log('\n--- 📅 CLASSES (Section CS) ---');
        const classes = await client.query("SELECT day, code, name, start_time, end_time, room FROM classes WHERE section = 'CS' ORDER BY day, start_time LIMIT 20");
        console.table(classes.rows);

        console.log('\n--- 📍 CAMPUS ZONES ---');
        const zones = await client.query("SELECT name, lat, lng, radius_m FROM campus_zones");
        console.table(zones.rows);

        console.log('\n--- 📝 ATTENDANCE (Latest 5) ---');
        const att = await client.query("SELECT u.name, c.code, a.date, a.status, a.distance_m FROM attendance a JOIN users u ON a.user_id = u.id JOIN classes c ON a.class_id = c.id ORDER BY a.marked_at DESC LIMIT 5");
        console.table(att.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}
dumpDb();
