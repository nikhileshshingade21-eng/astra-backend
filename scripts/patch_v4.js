const { Pool } = require('pg');
require('dotenv').config();

async function patch() {
    let connectionStr = process.env.DATABASE_URL;
    if (!connectionStr && process.env.DB_HOST) {
        connectionStr = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    }

    const pool = new Pool({
        connectionString: connectionStr,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- ASTRA V4 SCHEMA PATCH ---');
        
        // 1. Rename face_template to face_embedding if it exists
        console.log('1. Checking user table columns...');
        const colRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'face_template'
        `);
        
        if (colRes.rows.length > 0) {
            console.log('   -> Renaming face_template to face_embedding...');
            try {
                await pool.query('ALTER TABLE users RENAME COLUMN face_template TO face_embedding');
                console.log('   ✅ Renamed.');
            } catch (renameErr) {
                console.log('   -> Column already exists or could not rename:', renameErr.message);
            }
        } else {
            console.log('   -> Column face_template not found or already renamed.');
        }

        // 2. Add Unique Index on attendance
        console.log('2. Adding unique index to attendance...');
        try {
            await pool.query('CREATE UNIQUE INDEX idx_attendance_user_class_date ON attendance(user_id, class_id, date)');
            console.log('   ✅ Unique index created.');
        } catch (e) {
            if (e.code === '42P07') {
                console.log('   -> Index already exists.');
            } else {
                console.warn('   ⚠️ Could not create index (check for existing duplicates):', e.message);
                // Attempt to clean up duplicates if index creation fails
                console.log('   -> Cleaning up potential duplicates...');
                await pool.query(`
                    DELETE FROM attendance a
                    WHERE a.id > (
                        SELECT MIN(b.id) FROM attendance b
                        WHERE a.user_id = b.user_id 
                        AND a.class_id = b.class_id 
                        AND a.date = b.date
                    )
                `);
                await pool.query('CREATE UNIQUE INDEX idx_attendance_user_class_date ON attendance(user_id, class_id, date)');
                console.log('   ✅ Duplicates purged and index created.');
            }
        }

        console.log('--- PATCH COMPLETE ---');
    } catch (err) {
        console.error('❌ Patch failed:', err.message);
    } finally {
        await pool.end();
    }
}

patch();
