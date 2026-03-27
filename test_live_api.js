const fetch = require('node-fetch');

async function test() {
    const url = 'https://astra-backend-production-e996.up.railway.app/api/timetable/today?day=Wednesday&programme=B.Tech%20CSC&section=CS';
    try {
        console.log('Probing:', url);
        const res = await fetch(url);
        const data = await res.json();
        console.log('Live Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Probe failed:', err.message);
    }
}
test();
