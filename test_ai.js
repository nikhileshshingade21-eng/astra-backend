const http = require('http');

// First login to get a token, because the /api/ai endpoints require authMiddleware
const loginOpts = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(loginOpts, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.token) {
                 console.log("Got token automatically!");
                 testAI(json.token, 'TEST002');
            } else {
                console.log("Login failed, please register TEST002 first");
            }
        } catch(e) {}
    });
});

req.on('error', (e) => console.error(e));
req.write(JSON.stringify({ roll_number: 'TEST002', password: 'password' }));
req.end();

function testAI(token, rollNumber) {
    const aiOpts = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/ai/report/${rollNumber}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    const aiReq = http.request(aiOpts, (res) => {
        let aiData = '';
        res.on('data', (chunk) => aiData += chunk);
        res.on('end', () => {
             console.log('\n--- AI Report Response ---');
             console.log(JSON.stringify(JSON.parse(aiData), null, 2));
        });
    });
    
    aiReq.on('error', (e) => console.error(e));
    aiReq.end();
}
