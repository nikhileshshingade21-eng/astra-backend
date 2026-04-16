require('dotenv').config();
const { queryAll } = require('./database_module');

(async () => {
    const r = await queryAll("SELECT id, roll_number, name, role FROM users WHERE roll_number = '25N81A6258'");
    console.log('User record:', r);
    process.exit(0);
})();
