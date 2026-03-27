require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function auditRegistry() {
    try {
        console.log('--- REGISTRY AUDIT ---');
        const countRes = await queryAll('SELECT COUNT(*) FROM verified_students');
        console.log('Total verified students:', countRes[0].count);

        const samples = await queryAll('SELECT * FROM verified_students LIMIT 50');
        console.log('Sample Roll Numbers:');
        samples.forEach(s => console.log(`- [${s.roll_number}]`));
        
        console.log('--- END AUDIT ---');
        process.exit(0);
    } catch (err) {
        console.error('Audit failed:', err.message);
        process.exit(1);
    }
}

auditRegistry();
