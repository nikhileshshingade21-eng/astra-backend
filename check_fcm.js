require('dotenv').config();
const { queryAll } = require('./database_module');

(async () => {
    const r = await queryAll("SELECT fcm_token FROM users WHERE roll_number='25N81A6258'");
    console.log(r);
    process.exit(0);
})();
