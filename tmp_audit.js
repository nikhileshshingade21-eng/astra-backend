require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function main() {
    try {
        const counts = await queryAll(`
            SELECT SUBSTRING(roll_number, 7, 2) as dept_code, COUNT(*) 
            FROM verified_students 
            GROUP BY dept_code
        `);
        console.log('Institutional Department Codes (indexed at 7,2):', JSON.stringify(counts, null, 2));
    } catch (e) {
        console.error('Audit Error:', e.message);
    }
    process.exit(0);
}
main();
