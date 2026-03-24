const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('https://astra-backend-production-e996.up.railway.app/api/auth/login', {
            roll_number: '25N81A6258',
            password: 'test123',
            device_id: 'test_device'
        });
        console.log('Success:', res.data);
    } catch (err) {
        if (err.response) {
            console.error('API Error:', err.response.status, err.response.data);
        } else {
            console.error('Error:', err.message);
        }
    }
}

test();
