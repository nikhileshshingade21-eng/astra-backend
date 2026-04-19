require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function createBadgesTable() {
    try {
        console.log("Creating user_badges table...");
        await queryAll(`
            CREATE TABLE IF NOT EXISTS user_badges (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                badge_id VARCHAR(50) NOT NULL,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, badge_id)
            );
        `);
        console.log("Success: user_badges table is ready.");
    } catch (e) {
        console.error("Error creating table:", e.message);
    } finally {
        process.exit(0);
    }
}

createBadgesTable();
