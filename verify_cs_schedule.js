require('dotenv').config();
const { queryAll } = require('./database_module');

(async () => {
    try {
        const classCount = await queryAll("SELECT count(*) as count FROM classes WHERE section = 'CS'");
        console.log('CS Section Class Count:', classCount[0].count);
        
        const schedule = await queryAll("SELECT day, start_time, name FROM classes WHERE section = 'CS' ORDER BY day, start_time");
        console.log('--- Schedule for CS ---');
        console.log(JSON.stringify(schedule, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
})();
