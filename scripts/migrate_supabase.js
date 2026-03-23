require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupSchema() {
    const poolConfig = process.env.DATABASE_URL ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    } : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    };

    const pool = new Pool(poolConfig);

    try {
        console.log('Connecting to Supabase...');
        const client = await pool.connect();
        
        console.log('Reading schema file...');
        const schemaPath = 'C:\\Users\\nikhi\\.gemini\\antigravity\\brain\\fd4dc6d7-9932-4577-a905-f47b8d4e26ab\\supabase_schema.sql';
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema script...');
        // Split by semicolon and run each statement if needed, 
        // or just run the whole thing if the driver supports multiple statements (pg does)
        await client.query(schemaSql);
        
        console.log('✅ Schema deployed successfully!');
        client.release();
    } catch (err) {
        console.error('❌ Schema deployment failed:', err.message);
    } finally {
        await pool.end();
    }
}

setupSchema();
