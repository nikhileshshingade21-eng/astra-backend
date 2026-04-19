require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function checkTokens() {
    try {
        const users = await queryAll(`SELECT roll_number, name, fcm_token FROM users WHERE roll_number IN ('25N81A6258', '25N816243', '25N81A6243')`);
        console.table(users);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkTokens();
