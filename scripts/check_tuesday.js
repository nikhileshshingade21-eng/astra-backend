const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const { queryAll, pool } = require('./database_module.js');

async function check() {
    try {
        const rows = await queryAll('SELECT name, programme, section FROM classes WHERE day = $1', ['Tuesday']);
        console.log('Tuesday classes:', rows.length);
        rows.forEach(r => console.log(`- ${r.name} (${r.programme} / ${r.section})`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
