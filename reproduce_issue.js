require('dotenv').config();
const { getTodayClasses } = require('./controllers/timetableController');
const { queryAll } = require('./database_module.js');

async function testApi() {
    const roll = '25N81A6243';
    const userResult = await queryAll('SELECT * FROM users WHERE roll_number = $1', [roll]);
    const user = userResult[0];

    console.log('Testing for User:', user.name, 'Programme:', user.programme, 'Section:', user.section);

    const req = {
        user: user,
        query: { day: 'Tuesday' }
    };
    const res = {
        json: (data) => {
            console.log('\nResponse received:');
            console.log('Day:', data.day);
            console.log('Date:', data.date);
            console.log('Classes Count:', data.classes.length);
            data.classes.forEach(c => console.log(`- ${c.name} (${c.start_time})`));
        },
        status: (code) => ({
            json: (data) => console.log('Error', code, data)
        })
    };

    await getTodayClasses(req, res);
    process.exit();
}

testApi();
