require('dotenv').config();
const { getTodayClasses } = require('./controllers/timetableController');
const { queryAll } = require('./database_module.js');

async function verifyFix() {
    try {
        const roll = '25N81A6243';
        const userResult = await queryAll('SELECT * FROM users WHERE roll_number = $1', [roll]);
        const user = userResult[0];

        console.log('--- TEST 1: User-based fetch (Legacy) ---');
        const req1 = { user: user, query: { day: 'Tuesday' } };
        const res1 = { json: (data) => console.log('Classes:', data.classes.length) };
        await getTodayClasses(req1, res1);

        console.log('\n--- TEST 2: Query-based override ---');
        const req2 = { 
            user: { id: user.id }, // No programme/section in user object
            query: { day: 'Tuesday', programme: 'B.Tech CSC', section: 'CS' } 
        };
        const res2 = { json: (data) => console.log('Classes (Override):', data.classes.length) };
        await getTodayClasses(req2, res2);

        console.log('\n--- TEST 3: Invalid query (Should return ALL for day) ---');
        const req3 = { 
            user: { id: user.id }, 
            query: { day: 'Tuesday', programme: 'NON_EXISTENT', section: 'CS' } 
        };
        const res3 = { json: (data) => console.log('Classes (Invalid):', data.classes.length) };
        await getTodayClasses(req3, res3);

    } catch (err) {
        console.error('Verification error:', err.message);
    } finally {
        process.exit();
    }
}

verifyFix();
