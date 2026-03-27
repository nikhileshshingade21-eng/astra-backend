const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const { queryAll, pool } = require('./database_module.js');

async function check() {
    try {
        const classes = await queryAll("SELECT * FROM classes WHERE section = 'CS' AND day = 'Wednesday'");
        console.log('Wednesday Classes for CS:', JSON.stringify(classes, null, 2));
        
        const allDays = await queryAll("SELECT DISTINCT day FROM classes WHERE section = 'CS'");
        console.log('Days available for CS:', JSON.stringify(allDays, null, 2));
    } catch (err) {
        console.error('Check error:', err.message);
    } finally {
        await pool.end();
    }
}
check();
