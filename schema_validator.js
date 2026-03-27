const { queryAll } = require('./database_module');

/**
 * 🛰️ ASTRA Schema Validator (PostgreSQL Edition)
 * Ensures all critical tables exist with correctly indexed columns.
 */
async function validateSchema() {
    console.log('[🛡️ SCHEMA] Starting deep integrity check...');
    
    const tables = {
        users: `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                roll_number VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                programme VARCHAR(50),
                section VARCHAR(10),
                role VARCHAR(10) DEFAULT 'student' CHECK(role IN ('student','faculty','admin')),
                password_hash TEXT NOT NULL,
                biometric_enrolled INTEGER DEFAULT 0,
                face_enrolled INTEGER DEFAULT 0,
                biometric_template TEXT,
                face_template TEXT,
                is_registered BOOLEAN DEFAULT FALSE,
                device_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        campus_zones: `
            CREATE TABLE IF NOT EXISTS campus_zones (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                lat DOUBLE PRECISION NOT NULL,
                lng DOUBLE PRECISION NOT NULL,
                radius_m DOUBLE PRECISION NOT NULL DEFAULT 100
            )
        `,
        classes: `
            CREATE TABLE IF NOT EXISTS classes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) NOT NULL,
                name VARCHAR(100) NOT NULL,
                faculty_name VARCHAR(100),
                room VARCHAR(50),
                day VARCHAR(15) NOT NULL,
                start_time VARCHAR(10) NOT NULL,
                end_time VARCHAR(10) NOT NULL,
                programme VARCHAR(50),
                section VARCHAR(10),
                zone_id INTEGER REFERENCES campus_zones(id)
            )
        `,
        attendance: `
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                class_id INTEGER REFERENCES classes(id),
                date DATE NOT NULL,
                status VARCHAR(10) DEFAULT 'present' CHECK(status IN ('present','absent','late')),
                gps_lat DOUBLE PRECISION,
                gps_lng DOUBLE PRECISION,
                distance_m DOUBLE PRECISION,
                method VARCHAR(30) DEFAULT 'gps+biometric',
                marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        notifications: `
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                title VARCHAR(255) NOT NULL,
                message TEXT,
                type VARCHAR(10) DEFAULT 'info' CHECK(type IN ('info','warning','success','danger')),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        threat_logs: `
            CREATE TABLE IF NOT EXISTS threat_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                event_type VARCHAR(50) NOT NULL,
                threat_score INTEGER DEFAULT 0,
                severity VARCHAR(10) DEFAULT 'low' CHECK(severity IN ('low','medium','high','critical')),
                action_taken VARCHAR(20) DEFAULT 'monitor',
                details TEXT,
                ip_address VARCHAR(50),
                ai_recommendation TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        banned_users: `
            CREATE TABLE IF NOT EXISTS banned_users (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                reason TEXT NOT NULL,
                threat_score INTEGER DEFAULT 0,
                banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                is_permanent BOOLEAN DEFAULT FALSE,
                unbanned BOOLEAN DEFAULT FALSE
            )
        `,
        announcements: `
            CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(50) DEFAULT 'General',
                section VARCHAR(20) DEFAULT 'All',
                image_url TEXT,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        tenant_config: `
            CREATE TABLE IF NOT EXISTS tenant_config (
                id SERIAL PRIMARY KEY,
                institution_name VARCHAR(100) NOT NULL,
                primary_color VARCHAR(10) DEFAULT '#bf00ff',
                secondary_color VARCHAR(10) DEFAULT '#00f2ff',
                logo_url TEXT,
                welcome_msg TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        verified_students: `
            CREATE TABLE IF NOT EXISTS verified_students (
                id SERIAL PRIMARY KEY,
                roll_number VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                department VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `
    };

    for (const [name, sql] of Object.entries(tables)) {
        try {
            await queryAll(sql);
            // Check for missing columns in existing tables (e.g. is_registered in users)
            if (name === 'users') {
                const columns = await queryAll("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
                const colNames = columns.map(c => c.column_name);
                
                if (!colNames.includes('is_registered')) {
                    console.log('[🛡️ SCHEMA] Adding missing column: users.is_registered');
                    await queryAll('ALTER TABLE users ADD COLUMN is_registered BOOLEAN DEFAULT FALSE');
                }
                if (!colNames.includes('device_id')) {
                    console.log('[🛡️ SCHEMA] Adding missing column: users.device_id');
                    await queryAll('ALTER TABLE users ADD COLUMN device_id TEXT');
                }
            }

            if (name === 'attendance') {
                // BUG-002 FIX: Ensure Bulletproof Unique Constraint exists
                const constraints = await queryAll(`
                    SELECT conname FROM pg_constraint WHERE conname = 'unique_user_class_date'
                `);
                if (constraints.length === 0) {
                    console.log('[🛡️ SCHEMA] Establishing atomic index: unique_user_class_date');
                    await queryAll('ALTER TABLE attendance ADD CONSTRAINT unique_user_class_date UNIQUE (user_id, class_id, date)');
                }
            }
        } catch (err) {
            console.error(`[❌ SCHEMA] Failed to provision table ${name}:`, err.message);
        }
    }

    console.log('[🛡️ SCHEMA] Integrity check complete. Protocol: GREEN.');
}

module.exports = { validateSchema };
