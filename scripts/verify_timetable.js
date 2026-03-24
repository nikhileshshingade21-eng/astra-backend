const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

async function verify() {
    const port = process.env.PORT || 3000;
    const baseUrl = `http://localhost:${port}`;
    
    // Create a mock token for a student
    const token = jwt.sign({ id: 1, programme: 'B.Tech CSC', section: 'CS', role: 'student' }, process.env.JWT_SECRET);
    
    try {
        console.log(`🔍 Testing endpoint: ${baseUrl}/api/timetable/today`);
        const res = await axios.get(`${baseUrl}/api/timetable/today`, {
            params: { day: 'Monday' },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('✅ Response Received:');
        console.log(`   Day: ${res.data.day}`);
        console.log(`   Classes count: ${res.data.classes.length}`);
        
        if (res.data.classes.length > 0) {
            console.log('📝 Sample Class:', res.data.classes[0].name);
        } else {
            console.warn('⚠️ No classes found in response!');
        }
    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            console.error('❌ Error: Backend is not running at ' + baseUrl);
        } else {
            console.error('❌ Error:', err.response?.data || err.message);
        }
    }
}

verify();
