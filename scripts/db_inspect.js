require('dotenv').config();
const { queryAll } = require('../database_module');

async function inspect() {
    try {
        console.log('--- DATABASE INSPECTION ---');
        
        const tables = await queryAll(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', tables.map(t => t.table_name).join(', '));

        for (const table of tables) {
            const columns = await queryAll(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [table.table_name]);
            console.log(`\n[${table.table_name}]`);
            columns.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
        }
        
        process.exit();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

inspect();
