require('dotenv').config();
const { getTodayClasses } = require('../controllers/timetableController');

// Mock request and response
const req = {
    query: {
        day: 'Wednesday',
        programme: 'B.Tech CSC',
        section: 'CS'
    },
    user: {
        id: 11, // Nikhilesh
        programme: 'B.Tech CSC',
        section: 'CS'
    }
};

const res = {
    json: (data) => {
        console.log('✅ Success! Timetable returned:');
        console.log(`Day: ${data.day}, Date: ${data.date}`);
        console.log(`Classes count: ${data.classes.length}`);
        data.classes.forEach(c => console.log(` - ${c.name} (${c.start_time})`));
        process.exit(0);
    },
    status: (code) => ({
        json: (data) => {
            console.error(`❌ Failed with status ${code}:`, data);
            process.exit(1);
        }
    })
};

console.log('🧪 Testing getTodayClasses fix...');
getTodayClasses(req, res).catch(e => {
    console.error('💥 UNCAUGHT ERROR:', e);
    process.exit(1);
});
