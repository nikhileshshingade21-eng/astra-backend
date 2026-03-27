const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function apply() {
    let connectionStr = process.env.DATABASE_URL;
    if (!connectionStr && process.env.DB_HOST) {
        connectionStr = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    }

    const pool = new Pool({
        connectionString: connectionStr,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying full schema to PostgreSQL...');
        await pool.query(schema);
        console.log('✅ Schema applied successfully!');
        
    } catch (err) {
        console.error('❌ Failed to apply schema:', err.message);
    } finally {
        await pool.end();
    }
}

apply();
