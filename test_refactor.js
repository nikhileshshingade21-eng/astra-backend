const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Register Response:', data);
        
        try {
            const json = JSON.parse(data);
            if (json.token) {
                 testAdmin(json.token);
            }
        } catch(e) {}
    });
});

req.on('error', (e) => console.error(e));
req.write(JSON.stringify({ roll_number: 'TEST002', name: 'Test User', password: 'password', role: 'admin' }));
req.end();

function testAdmin(token) {
    const adminOpts = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/users',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    const adminReq = http.request(adminOpts, (res) => {
        let adminData = '';
        res.on('data', (chunk) => adminData += chunk);
        res.on('end', () => {
            console.log('Admin Users Response:', adminData);
        });
    });
    
    adminReq.on('error', (e) => console.error(e));
    adminReq.end();
}
