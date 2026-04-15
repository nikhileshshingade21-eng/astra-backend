require('dotenv').config();
const { queryAll } = require('./database_module');

async function checkUser11() {
    try {
        console.log('Checking user ID 11 fcm_token...');
        const res = await queryAll("SELECT id, roll_number, name, fcm_token FROM users WHERE id = 11 OR roll_number = '25N81A6258'");
        console.table(res);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkUser11();
