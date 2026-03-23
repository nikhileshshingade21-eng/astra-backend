require('dotenv').config();
const { Client } = require('pg');

async function testCombinations() {
    const host = 'aws-0-ap-south-1.pooler.supabase.com';
    const port = 6543;
    const password = 'jv8G2$dU,E%_uF!';
    const ref = 'puyulkjtrmbkiljlbuqw';
    
    const combos = [
        { user: `postgres.${ref}`, db: 'postgres' },
        { user: `postgres`, db: ref },
        { user: `postgres.${ref}`, db: ref },
        { user: `postgres`, db: 'postgres' }
    ];

    for (const combo of combos) {
        console.log(`\n--- Testing User: ${combo.user}, DB: ${combo.db} ---`);
        const client = new Client({
            host, port, user: combo.user, password, database: combo.db,
            ssl: { rejectUnauthorized: false }
        });
        try {
            await client.connect();
            console.log('✅ SUCCESS!');
            await client.end();
            return;
        } catch (err) {
            console.error('❌ Failed:', err.message);
        }
    }
}

testCombinations();
