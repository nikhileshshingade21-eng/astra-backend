require('dotenv').config();
const { verify } = require('./controllers/authController');

async function test() {
    const req = {
        body: { roll_number: '25N81A6258' }
    };
    const res = {
        json: (data) => console.log('Response:', JSON.stringify(data, null, 2)),
        status: (code) => ({ json: (data) => console.log(`Status ${code}:`, JSON.stringify(data, null, 2)) })
    };

    try {
        console.log('Testing verify controller for 25N81A6258...');
        await verify(req, res);
    } catch (err) {
        console.error('Test failed:', err.message);
    } finally {
        process.exit();
    }
}

test();
