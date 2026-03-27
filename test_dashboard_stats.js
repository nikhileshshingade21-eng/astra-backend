require('dotenv').config();
const { getDashboardStats } = require('./controllers/dashboardController');

// Mock request and response
const req = {
    user: { id: 3, programme: 'B.Tech CSC', section: 'CS' }
};

const res = {
    json: (data) => {
        console.log('Dashboard Stats Output:');
        console.log(JSON.stringify(data, null, 2));
    },
    status: (code) => ({
        json: (data) => console.log(`Error ${code}:`, data)
    })
};

async function test() {
    console.log('Testing dashboardController.getDashboardStats...');
    await getDashboardStats(req, res);
}

test();
