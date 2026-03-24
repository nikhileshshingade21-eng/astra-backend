const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const { queryAll, pool } = require('./database_module.js');

async function check() {
    try {
        const u = await queryAll('SELECT id, roll_number, name, programme, section, is_registered FROM users');
        console.log('Users found:', u.length);
        u.forEach(user => {
            console.log(`- ${user.roll_number}: ${user.name} | P: ${user.programme} | S: ${user.section} | Reg: ${user.is_registered}`);
        });
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
