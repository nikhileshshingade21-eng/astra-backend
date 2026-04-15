require('dotenv').config();
const { queryAll } = require('./database_module');

async function migrateM2() {
    console.log("🚀 Starting M2 Notification Intelligence DB Migration...");

    try {
        await queryAll(`
            CREATE TABLE IF NOT EXISTS user_behavior_logs (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(255) NOT NULL,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Created user_behavior_logs table");

        await queryAll(`
            CREATE TABLE IF NOT EXISTS notification_history (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(255) NOT NULL,
                title VARCHAR(255),
                message TEXT,
                status VARCHAR(50) DEFAULT 'delivered',
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Created notification_history table");

        await queryAll(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                quiet_hours_start TIME DEFAULT '22:00',
                quiet_hours_end TIME DEFAULT '08:00',
                prefers_morning BOOLEAN DEFAULT true,
                prefers_night BOOLEAN DEFAULT true,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Created user_preferences table");

        console.log("🎉 M2 Database Schema Successfully Applied!");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    }
    process.exit(0);
}

migrateM2();
