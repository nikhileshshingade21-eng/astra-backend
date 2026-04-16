require('dotenv').config();
const { queryAll } = require('./database_module.js');

queryAll(`UPDATE users SET role = 'admin' WHERE roll_number = '25N81A6258'`)
    .then(() => console.log('Updated user to admin'))
    .catch(console.error)
    .finally(() => process.exit());
