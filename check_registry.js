const { queryAll } = require('./database_module.js');
require('dotenv').config();

async function check() {
    try {
        console.log('Checking verified_students table...');
        const res = await queryAll('SELECT * FROM verified_students WHERE roll_number = $1', ['25N81A6258']);
        console.log('Result for 25N81A6258:', JSON.stringify(res, null, 2));
        
        const count = await queryAll('SELECT count(*) FROM verified_students');
        console.log('Total verified students:', count[0].count);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

check();
