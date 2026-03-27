require('dotenv').config();
const { getDb, queryAll } = require('../database_module');

async function migrate() {
    try {
        console.log('[MIGRATION] Checking for face_embedding column...');
        const check = await queryAll(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'face_embedding'
        `);

        if (check.length === 0) {
            console.log('[MIGRATION] Adding face_embedding column to users table...');
            await queryAll('ALTER TABLE users ADD COLUMN face_embedding TEXT');
            console.log('[MIGRATION] Success.');
        } else {
            console.log('[MIGRATION] Column already exists.');
        }
        process.exit(0);
    } catch (err) {
        console.error('[MIGRATION] Failed:', err.message);
        process.exit(1);
    }
}

migrate();
