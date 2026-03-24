const axios = require('axios');

async function testFullFlow() {
    const BASE_URL = 'https://astra-backend-production-e996.up.railway.app';
    const credentials = {
        roll_number: '25N81A6258',
        password: 'nikhilesh'
    };

    try {
        console.log('1. Trying Login...');
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
        console.log('   Login Success! Token obtained.');
        const token = loginRes.data.token;
        const user = loginRes.data.user;
        console.log(`   User: ${user.name} | Prog: ${user.programme} | Sec: ${user.section}`);

        console.log('\n2. Fetching Timetable for Today...');
        const ttRes = await axios.get(`${BASE_URL}/api/timetable`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`   Fetched Day: ${ttRes.data.day}`);
        console.log(`   Classes found: ${ttRes.data.classes.length}`);
        
        if (ttRes.data.classes.length > 0) {
            ttRes.data.classes.forEach(c => {
                console.log(`   - ${c.start_time} | ${c.name} | ${c.faculty}`);
            });
        } else {
            console.log('   ❌ NO CLASSES RETURNED BY API');
        }

    } catch (err) {
        console.error('ERROR:', err.response ? err.response.data : err.message);
    }
}

testFullFlow();
