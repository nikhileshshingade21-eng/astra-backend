require('dotenv').config();
const { mark } = require('../controllers/attendanceController');
const crypto = require('crypto');

async function testMarking(label, class_id, lat, lng, userId, deviceId) {
    console.log(`\n--- Test Case: ${label} ---`);
    
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

    await mark(req, res);
}

async function run() {
    const freshUserId = 99999 + Math.floor(Math.random() * 10000); // Random ID to avoid collision/history
    const deviceId = 'new-device-999';
    const classId = 391;

    // Test: Valid - Center of Main Block (CS)
    await testMarking('Valid Coordinate (Fresh User)', classId, 17.281014, 78.548633, freshUserId, deviceId);

    process.exit(0);
}

run();
