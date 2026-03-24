const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const { queryAll, pool } = require('./database_module.js');

async function run() {
    try {
        console.log('[MIGRATION] Dropping and Recreating feedback table...');
        await queryAll(`DROP TABLE IF EXISTS feedback`);
        await queryAll(`
            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                type VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('[SUCCESS] Feedback table created.');
        
        // Final audit of public tables
        const tables = await queryAll("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('[AUDIT] Current Tables:', tables.map(t => t.table_name).join(', '));
        
    } catch (err) {
        console.error('[ERROR] Migration failed:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
