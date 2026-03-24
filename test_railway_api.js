const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET = 'xK9$mP2vL7qR4wN8jF5sA3hY6tB0cE1dG#uI9oZ';
const RAILWAY_URL = 'https://astra-backend-production-e996.up.railway.app';

// User ID for Nikhilesh (found via previous query)
const userId = 2; 

async function test() {
    try {
        console.log('Generating token...');
        const token = jwt.sign({ userId, role: 'student' }, JWT_SECRET, { expiresIn: '1h' });
        
        console.log('Fetching timetable from Railway...');
        const res = await axios.get(`${RAILWAY_URL}/api/timetable/today`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Response Status:', res.status);
        console.log('Response Data:', JSON.stringify(res.data, null, 2));
        
        if (res.data.classes.length > 0) {
            console.log('✅ SUCCESS: Live API returned data!');
        } else {
            console.log('❌ FAILURE: Live API returned NO classes.');
        }
    } catch (err) {
        if (err.response) {
            console.error('API Error:', err.response.status, err.response.data);
        } else {
            console.error('Error:', err.message);
        }
    }
}

test();
