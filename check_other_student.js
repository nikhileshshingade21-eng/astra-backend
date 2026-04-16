require('dotenv').config();
const { queryAll } = require('./database_module');

(async () => {
    const r = await queryAll("SELECT id, name, programme, section, fcm_token FROM users WHERE roll_number = '25N81A6243'");
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
})();
