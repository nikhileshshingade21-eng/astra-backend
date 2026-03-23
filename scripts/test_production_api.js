// Production API End-to-End Test Script
const axios = require('axios');

const API_BASE = 'https://astra-backend-production-e996.up.railway.app';
const testUser = {
    roll_number: 'TEST' + Date.now(),
    name: 'End-to-End Tester',
    email: `test_${Date.now()}@astra.edu`,
    password: 'password123',
    programme: 'B.Tech CS',
    section: 'A',
    role: 'student'
};

async function runTests() {
    console.log('🚀 INITIATING PRODUCTION CLOUD TEST...\n');

    try {
        // 1. Health Check
        console.log('1. [GET] /api/health');
        const health = await axios.get(`${API_BASE}/api/health`);
        console.log('   ✅ Health OK:', health.data.status);

        // 2. Registration
        console.log(`2. [POST] /api/auth/register (Roll: ${testUser.roll_number})`);
        const reg = await axios.post(`${API_BASE}/api/auth/register`, testUser);
        console.log('   ✅ Registration Successful! ID:', reg.data.user.id);

        // 3. Login
        console.log('3. [POST] /api/auth/login');
        const login = await axios.post(`${API_BASE}/api/auth/login`, {
            roll_number: testUser.roll_number,
            password: testUser.password
        });
        console.log('   ✅ Login Successful! Token Received.');

        // 4. Verification Check
        console.log('4. [GET] /api/auth/me');
        const me = await axios.get(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${login.data.token}` }
        });
        console.log('   ✅ Profile Verified:', me.data.user.name);

        console.log('\n🌟 PRODUCTION API TEST: 100% PASSED');
    } catch (err) {
        console.error('\n❌ TEST FAILED');
        if (err.response) {
            console.log('--- SERVER ERROR RESPONSE ---');
            console.log('Status:', err.response.status);
            console.log('Body:', JSON.stringify(err.response.data, null, 2));
            console.log('-----------------------------');
        } else if (err.request) {
            console.error('No response received from server. Is the URL correct?');
        } else {
            console.error('Error:', err.message);
        }
    }
}

runTests();
