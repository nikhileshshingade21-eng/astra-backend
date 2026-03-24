const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const { queryAll, pool } = require('./database_module.js');

async function check() {
    try {
        const rows = await queryAll('SELECT count(*) FROM classes');
        console.log('Total classes in DB:', rows[0].count);
        
        const csRows = await queryAll('SELECT count(*) FROM classes WHERE section = $1', ['CS']);
        console.log('CS Section classes:', csRows[0].count);
        
        const mondayRows = await queryAll('SELECT name, start_time FROM classes WHERE day = $1 AND section = $2', ['Monday', 'CS']);
        console.log('Monday CS classes:', mondayRows.length);
        if (mondayRows.length > 0) {
            console.log('First class:', mondayRows[0].name, '@', mondayRows[0].start_time);
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
