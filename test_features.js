const http = require('http');

const loginOpts = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
};

const req = http.request(loginOpts, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.token) {
                 testFeatures(json.token);
            }
        } catch(e) {}
    });
});
req.write(JSON.stringify({ roll_number: 'TEST002', password: 'password' }));
req.end();

function testFeatures(token) {
    // Test GET Marks
    http.request({
        hostname: 'localhost', port: 3000, path: '/api/marks/me', method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
        let d = '';
        res.on('data', (c) => d += c);
        res.on('end', () => console.log('Marks:', d));
    }).end();

    // Test GET Leaves
    http.request({
        hostname: 'localhost', port: 3000, path: '/api/leaves/me', method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
        let d = '';
        res.on('data', (c) => d += c);
        res.on('end', () => console.log('Leaves:', d));
    }).end();
}
