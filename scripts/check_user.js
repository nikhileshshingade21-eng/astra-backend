require('dotenv').config();
const { queryAll } = require('../database_module');

async function checkUser(rollNumber) {
    try {
        console.log(`Checking user: ${rollNumber}`);
        const res = await queryAll('SELECT id, roll_number, name, role, is_registered, device_id, fcm_token, password_hash FROM users WHERE roll_number = $1', [rollNumber]);
        console.log('User Data:', JSON.stringify(res, null, 2));

        const verified = await queryAll('SELECT * FROM verified_students WHERE roll_number = $1', [rollNumber]);
        console.log('Verified Registry Data:', JSON.stringify(verified, null, 2));
        
        process.exit();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

const target = process.argv[2] || '25N81A6243';
checkUser(target);
