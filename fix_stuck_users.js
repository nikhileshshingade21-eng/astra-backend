require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function fixUsers() {
    try {
        const result = await queryAll('UPDATE users SET is_registered = TRUE WHERE is_registered = FALSE OR is_registered IS NULL');
        console.log('Fixed users in database.');
    } catch (err) {
        console.error('Error fixing users:', err.message);
    } finally {
        process.exit();
    }
}

fixUsers();
