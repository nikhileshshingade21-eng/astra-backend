const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: false // Try without SSL first to see if port 6543 likes it
    });

    try {
        await client.connect();
        console.log('Connected!');
        const res = await client.query('SELECT roll_number FROM verified_students LIMIT 50');
        console.log('Verified students in DB:');
        res.rows.forEach(r => console.log(`- ${r.roll_number}`));
        await client.end();
    } catch (e) {
        console.error('Failed:', e.message);
        if (e.message.includes('SSL connection is required')) {
            console.log('Retrying with SSL...');
            const clientSsl = new Client({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                ssl: { rejectUnauthorized: false }
            });
            await clientSsl.connect();
            const res = await clientSsl.query('SELECT roll_number FROM verified_students LIMIT 50');
            res.rows.forEach(r => console.log(`- ${r.roll_number}`));
            await clientSsl.end();
        }
    }
}

check();
