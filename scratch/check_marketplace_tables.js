require('dotenv').config();
const { queryAll } = require('../database_module');

async function checkTables() {
    try {
        console.log('[CHECK] Verifying marketplace tables...');
        const tables = await queryAll(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('marketplace_items', 'marketplace_reactions', 'marketplace_conversations', 'marketplace_messages')
        `);
        console.log('[CHECK] Tables Found:', tables.map(t => t.table_name));
        
        const marketplace_items = await queryAll('SELECT count(*) FROM marketplace_items');
        console.log('[CHECK] Marketplace Items Count:', marketplace_items[0].count);

    } catch (e) {
        console.error('[CHECK] DB Fetch Failed:', e.message);
    } finally {
        process.exit();
    }
}

checkTables();
