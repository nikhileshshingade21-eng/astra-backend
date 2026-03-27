require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function debugDays() {
    try {
        const days = await queryAll("SELECT DISTINCT day FROM classes");
        console.log('Days in DB JSON:');
        days.forEach(d => {
            console.log(`- [${d.day}] (Length: ${d.day.length}) JSON: ${JSON.stringify(d.day)}`);
        });
    } catch (err) {
        console.error('Debug error:', err.message);
    } finally {
        process.exit();
    }
}

debugDays();
