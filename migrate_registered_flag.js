require('dotenv').config();
const { pool } = require('./database_module');

async function migrate() {
    try {
        console.log('[MIGRATE] Adding is_registered column to users...');
        
        // 1. Add column if it doesn't exist
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT FALSE
        `);
        
        // 2. BACKFILL: Set existing users with biometrics as registered
        const result = await pool.query(`
            UPDATE users 
            SET is_registered = TRUE 
            WHERE biometric_enrolled > 0 OR face_enrolled > 0
        `);
        
        console.log(`[SUCCESS] Migration complete. ${result.rowCount} users marked as registered.`);
        process.exit(0);
    } catch (err) {
        console.error('[ERROR] Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
