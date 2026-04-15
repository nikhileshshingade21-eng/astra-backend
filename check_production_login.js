require('dotenv').config();
const { queryAll } = require('./database_module');

async function checkUserLogin() {
    try {
        console.log('Checking user ID 11 production status...');
        const res = await queryAll("SELECT id, roll_number, last_login, updated_at FROM users WHERE id = 11");
        console.table(res);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkUserLogin();
