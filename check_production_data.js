const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const { queryAll, pool } = require('./database_module.js');

async function check() {
    try {
        const users = await queryAll("SELECT roll_number, name, programme, section FROM users WHERE roll_number = '25N81A6258'");
        console.log('Production User Data:', JSON.stringify(users, null, 2));
        
        const classes = await queryAll("SELECT COUNT(*) FROM classes WHERE section = 'CS'");
        console.log('Class count for section CS:', classes[0].count);
        
        const allSections = await queryAll("SELECT DISTINCT section, programme FROM classes");
        console.log('Available classes sections:', JSON.stringify(allSections, null, 2));
    } catch (err) {
        console.error('Check error:', err.message);
    } finally {
        await pool.end();
    }
}
check();
