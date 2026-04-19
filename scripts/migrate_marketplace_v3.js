require('dotenv').config();
const { queryAll } = require('../database_module');

async function migrate() {
    try {
        console.log('🚀 Starting Marketplace V3 Migration...');

        // 1. Items Table update
        await queryAll(`
            ALTER TABLE marketplace_items 
            ADD COLUMN IF NOT EXISTS image_url TEXT,
            ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Others'
        `);
        console.log('✅ Updated marketplace_items schema.');

        // 2. Reactions Table
        await queryAll(`
            CREATE TABLE IF NOT EXISTS marketplace_reactions (
                id SERIAL PRIMARY KEY,
                item_id INTEGER REFERENCES marketplace_items(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id),
                reaction_type VARCHAR(20) DEFAULT 'like',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(item_id, user_id)
            )
        `);
        console.log('✅ Created marketplace_reactions table.');

        // 3. Conversations Table
        await queryAll(`
            CREATE TABLE IF NOT EXISTS marketplace_conversations (
                id SERIAL PRIMARY KEY,
                item_id INTEGER REFERENCES marketplace_items(id) ON DELETE CASCADE,
                buyer_id INTEGER REFERENCES users(id),
                seller_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(item_id, buyer_id, seller_id)
            )
        `);
        console.log('✅ Created marketplace_conversations table.');

        // 4. Messages Table
        await queryAll(`
            CREATE TABLE IF NOT EXISTS marketplace_messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created marketplace_messages table.');

        console.log('🎉 Migration Completed Successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err.message);
        process.exit(1);
    }
}

migrate();
