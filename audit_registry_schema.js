require('dotenv').config();
const { queryAll } = require('./database_module');

async function checkSchema() {
    try {
        console.log('1. Fetching column names for verified_students...');
        const res = await queryAll(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'verified_students'
        `);
        console.log('Schema:', JSON.stringify(res, null, 2));

        const roll = '25N81A6258';
        const name = 'Nikhilesh shingade';
        
        // Use the correct column name based on the schema audit
        // If the table is empty or column is missing, we'll fix it in the next step.

    } catch (err) {
        console.error('❌ Check failed:', err.message);
    } finally {
        process.exit();
    }
}

checkSchema();
