const { Pool } = require('pg');

async function updateZone() {
    return new Promise((resolve, reject) => {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        console.log('Connecting to:', process.env.DATABASE_URL.split('@')[1].split(':')[0]);
        
        pool.query(
            "UPDATE campus_zones SET lat = $1, lng = $2, radius_m = $3 WHERE name = 'Class 214'",
            ['17.282058', '78.553303', 50],
            (err, res) => {
                if (err) return reject(err);
                console.log('Updated Class 214 coordinates successfully.');
                pool.end();
                resolve();
            }
        );
    });
}

updateZone().catch(console.error);
