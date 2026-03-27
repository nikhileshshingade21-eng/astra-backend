require('dotenv').config();
const { mark } = require('../controllers/attendanceController');
const crypto = require('crypto');

async function testMarking(label, class_id, lat, lng, userId, deviceId) {
    console.log(`\n--- Test Case: ${label} ---`);
    console.log(`Input -> Class: ${class_id}, GPS: ${lat}, ${lng}`);
    
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const secret = process.env.APP_PROTO_SECRET || 'ASTRA_PROTO_V4_SECRET';
    
    const signatureBase = `${timestamp}:${nonce}:${class_id || 'general'}:${userId}:${deviceId}`;
    const signature = crypto.createHash('sha256')
        .update(signatureBase + secret)
        .digest('hex');

    const req = {
        body: { class_id, gps_lat: lat, gps_lng: lng, method: 'gps+biometric' },
        user: { id: userId, device_id: deviceId, programme: 'B.Tech CSC', section: 'CS', role: 'student' },
        headers: {
            'x-astra-timestamp': timestamp,
            'x-astra-nonce': nonce,
            'x-astra-signature': signature
        },
        ip: '127.0.0.1'
    };

    const res = {
        json: (data) => console.log('Result:', JSON.stringify(data, null, 2)),
        status: (code) => ({
            json: (data) => console.log(`Error (${code}):`, JSON.stringify(data, null, 2))
        })
    };

    try {
        await mark(req, res);
    } catch (e) {
        console.error('Simulation crashed:', e);
    }
}

async function run() {
    const userId = 1; // Assuming user ID 1 exists
    const deviceId = 'test-device-uuid';
    const classId = 391; // Thursday ITWS class from database

    // Test 1: Valid - Center of Main Block (CS)
    await testMarking('Valid Coordinate', classId, 17.281014, 78.548633, userId, deviceId);

    // Test 2: Invalid - 1km away
    await testMarking('Out of Bounds (1km)', classId, 17.291014, 78.548633, userId, deviceId);

    // Test 3: Anomaly - Null Island
    await testMarking('Anomaly (Null Island)', classId, 0, 0, userId, deviceId);

    process.exit(0);
}

run();
