require('dotenv').config();
const { queryAll } = require('./database_module');

(async () => {
    await queryAll("UPDATE users SET role = 'student' WHERE roll_number = '25N81A6258'");
    const r = await queryAll("SELECT id, roll_number, name, role FROM users WHERE roll_number = '25N81A6258'");
    console.log('Updated:', r);
    process.exit(0);
})();
