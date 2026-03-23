require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
    console.log('Testing with HARDCODED direct params (AWS-1-SESSION)...');
    const config = {
        host: 'aws-1-ap-south-1.pooler.supabase.com',
        port: 5432,
        user: 'postgres.puyulkjtrmbkiljlbuqw',
        password: 'jv8G2$dU,E%_uF!',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    };
    
    console.log('Config:', { ...config, password: '***' });
    
    const client = new Client(config);
    try {
        await client.connect();
        console.log('✅ Connection successful!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    }
}

testConnection();
