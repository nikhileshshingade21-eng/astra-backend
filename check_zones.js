const { queryAll } = require('./database_module.js');

async function checkZones() {
    const zones = await queryAll('SELECT * FROM campus_zones');
    console.log('--- CAMPUS ZONES ---');
    console.table(zones);
}
checkZones();
