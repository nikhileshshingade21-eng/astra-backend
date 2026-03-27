require('dotenv').config();
const { getTodayClasses } = require('../controllers/timetableController');

async function test(label, section, programme) {
    console.log(`\n--- Test Case: ${label} ---`);
    console.log(`Input -> S: ${section}, P: ${programme}`);
    
    const req = {
        query: { day: 'Thursday', programme, section },
        user: { id: 1, programme, section }
    };

    const res = {
        json: (data) => {
            console.log(`Result: ${data.classes?.length || 0} classes found.`);
            if (data.classes && data.classes.length > 0) {
                console.log(`First Class: ${data.classes[0].code} for Section: ${data.classes[0].section}`);
            }
        },
        status: (code) => ({
            json: (data) => console.log(`Error (${code}):`, data.error)
        })
    };

    await getTodayClasses(req, res);
}

async function run() {
    // 1. Exact Match (CS)
    await test('Exact Match', 'CS', 'B.Tech CSC');
    
    // 2. Smart Match (User in CSC section, but classes in CS) - This is what might be happening
    await test('Smart Match (Section=CSC)', 'CSC', 'B.Tech CSC');

    // 3. Fallback Match (Section=all)
    await test('Fallback Match (Section=all)', 'all', 'B.Tech CSC');

    process.exit(0);
}

run();
