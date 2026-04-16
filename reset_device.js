require('dotenv').config();
const { queryAll } = require('./database_module');

(async () => {
    // Clear device_id to allow a new device binding
    await queryAll("UPDATE users SET device_id = NULL WHERE roll_number = '25N81A6258'");
    console.log('DEVICE BINDING RESET for 25N81A6258');
    process.exit(0);
})();
