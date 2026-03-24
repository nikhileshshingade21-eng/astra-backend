require('dotenv').config();
const { pool } = require('./database_module');

async function migrate() {
    try {
        console.log('[MIGRATE] Adding device_id column to users...');
        
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS device_id TEXT
        `);
        
        console.log(`[SUCCESS] Migration complete. device_id column added.`);
        process.exit(0);
    } catch (err) {
        console.error('[ERROR] Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
