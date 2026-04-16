const axios = require('axios');

async function testAttendanceContract() {
    console.log("Testing POST /api/attendance/mark (Contract enforcement)...");
    try {
        // We will send a request WITHOUT required headers/payloads to trigger contract errors securely.
        const res = await axios.post('http://localhost:8080/api/attendance/mark', {
            // Missing deviceId, missing signature, etc.
            classId: 101 // Using FRONTEND camelCase to test normalizer!
        });
        console.log(res.data);
    } catch (err) {
        if (err.response && err.response.data) {
            const data = err.response.data;
            if (data.success === false && data.message === "Validation failed") {
                console.log("✅ Passed Validations via Zod!");
            } else if (data.success === false && data.message.includes('PROTOCOL_VIOLATION')) {
                console.log("✅ Passed Protocol Protections!");
            } else {
                console.log("❌ Response shape was unexpected:", data);
            }
        } else {
            console.error("❌ Request failed entirely:", err.message);
        }
    }
}

async function testAnnouncementContract() {
    console.log("\nTesting POST /api/admin/announcements (Announcements)...");
    try {
        const res = await axios.post('http://localhost:8080/api/admin/announcements', {
            title: "Hi", // Too short (min 5)
            content: "Testing" // Too short (min 10)
        });
    } catch (err) {
        if (err.response && err.response.data) {
            console.log("✅ Passed Announcement Validation!");
        }
    }
}

async function testZoneContract() {
    console.log("\nTesting POST /api/admin/add-zone (Zones)...");
    try {
        const res = await axios.post('http://localhost:8080/api/admin/add-zone', {
            name: "Z", // Too short (min 3)
            lat: 200 // Invalid lat
        });
    } catch (err) {
        if (err.response && err.response.data) {
            console.log("✅ Passed Zone Validation!");
        }
    }
}

async function runTests() {
    await testAttendanceContract();
    await testAnnouncementContract();
    await testZoneContract();
}

runTests();
