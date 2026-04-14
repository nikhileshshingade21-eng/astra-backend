const { Pool } = require('pg');
require('dotenv').config();

// Backend's own connection logic
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
        console.log(`Connecting to: ${process.env.DB_HOST}`);
        
        const SEARCH_ROLL = '25N81A6258';
        
        // Exact match check with lengths
        const res = await pool.query(
            "SELECT id, roll_number, LENGTH(roll_number) as len, name FROM verified_students WHERE roll_number ILIKE $1",
            [`%${SEARCH_ROLL}%`]
        );
        
        console.log('\n=== Registry Search Results ===');
        res.rows.forEach(r => {
            console.log(`ID: ${r.id} | Roll: "${r.roll_number}" | Length: ${r.len} | Name: ${r.name}`);
        });

        if (res.rows.length === 0) {
            console.log('\n❌ Roll number not found even with ILIKE search!');
            const total = await pool.query("SELECT count(*) FROM verified_students");
            console.log('Total verified students:', total.rows[0].count);
        } else {
            const exact = res.rows.find(r => r.roll_number.trim().toUpperCase() === SEARCH_ROLL);
            if (exact) {
                console.log('\n✅ Found exact match after trimming.');
            } else {
                console.log('\n❌ No exact match found even in search results.');
            }
        }
        
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
})();
