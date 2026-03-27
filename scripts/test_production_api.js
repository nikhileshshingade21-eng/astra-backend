const axios = require('axios');

const URL = 'https://astra-backend-production-e996.up.railway.app';

async function testLogin() {
    try {
        console.log('Testing Login on current Production (1.0.5)');
        const response = await axios.post(`${URL}/api/auth/login`, {
            roll_number: 'TEST_USER', 
            password: 'Password123!',
            device_id: 'CURL_TEST'
        });
        console.log('Login Result:', response.data);
    } catch (err) {
        if (err.response) {
            console.error('Login Failed with response:', err.response.status, err.response.data);
        } else {
            console.error('Login Failed:', err.message);
        }
    }
}

testLogin();
