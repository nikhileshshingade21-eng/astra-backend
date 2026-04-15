require('dotenv').config();
const { queryAll } = require('./database_module');

async function checkTodayTimetable() {
    try {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(Date.now() + istOffset);
        const currentDay = dayNames[istTime.getUTCDay()];
        
        console.log(`Checking timetable for ${currentDay} (Today)...`);
        const res = await queryAll(`
            SELECT name, start_time, end_time, room 
            FROM classes 
            WHERE day = $1 
            ORDER BY start_time ASC
        `, [currentDay]);
        console.table(res);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkTodayTimetable();
