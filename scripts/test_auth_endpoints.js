const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const ROLL = '25N81A6258 '; // Intentional trailing space

async function runTest() {
    console.log(`🚀 Starting Auth Endpoint Diagnostic with Axios for: "${ROLL}"\n`);

    try {
        // 1. Test Verify
        console.log('Step 1: Testing /api/auth/verify...');
        const vRes = await axios.post(`${API_BASE}/api/auth/verify`, { roll_number: ROLL });
        console.log('  Status:', vRes.status);
        console.log('  Data:', JSON.stringify(vRes.data, null, 2));

        if (vRes.data.valid) {
            console.log('  ✅ ID is valid in registry (TRIM working)');
        } else {
            console.log('  ❌ ID NOT found in registry');
        }

        // 2. Test Register
        console.log('\nStep 2: Testing /api/auth/register (Dry run)...');
        try {
            const rRes = await axios.post(`${API_BASE}/api/auth/register`, { 
                roll_number: ROLL, 
                name: 'Nikhilesh Shingade',
                password: 'testpassword123',
                device_id: 'DIAGNOSTIC_TEST_DEVICE',
                biometric_enrolled: true,
                face_enrolled: false
            });
            console.log('  Status:', rRes.status);
            console.log('  Data:', JSON.stringify(rRes.data, null, 2));
            console.log('  ✅ Registry check passed');
        } catch (err) {
            console.log('  Status:', err.response?.status);
            console.log('  Data:', JSON.stringify(err.response?.data, null, 2));
            if (err.response?.status === 409) {
                 console.log('  ✅ Already registered (Registry check passed)');
            } else if (err.response?.status === 403) {
                 console.log('  ❌ Registry check failed: "Identity not found"');
            } else {
                 console.log('  ❌ Unexpected error:', err.message);
            }
        }

        console.log('\n🎯 DIAGNOSTIC COMPLETE');
    } catch (e) {
        console.error('\n❌ CONNECTION ERROR: Is the backend running on port 3000?');
        console.error(e.message);
    }
}

runTest();
