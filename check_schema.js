require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function checkSchema() {
    try {
        const rows = await queryAll(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'campus_zones'
        `);
        console.log('Columns in campus_zones:');
        rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}

checkSchema();
