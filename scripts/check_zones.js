const { Pool } = require('pg');

async function checkZones() {
    return new Promise((resolve, reject) => {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        console.log('Connecting to:', process.env.DATABASE_URL.split('@')[1].split(':')[0]);
        
        pool.query('SELECT * FROM campus_zones', (err, res) => {
            if (err) return reject(err);
            console.log('=== Campus Zones ===');
            console.table(res.rows);
            pool.end();
            resolve();
        });
    });
}

checkZones().catch(console.error);
