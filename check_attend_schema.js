require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function checkAttendanceSchema() {
    try {
        console.log('--- DB ATTENDANCE SCHEMA CHECK ---');
        // PostgreSQL query to get column info
        const res = await queryAll(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'attendance'
        `);
        
        console.log('Columns found in "attendance" table:');
        res.forEach(c => console.log(`- ${c.column_name} (${c.data_type})`));
        
        const hasMethod = res.some(c => c.column_name === 'method');
        const hasClassId = res.some(c => c.column_name === 'class_id');
        
        if (hasMethod && hasClassId) {
            console.log('\n✅ Backend is READY for QR Scanning.');
        } else {
            console.log('\n❌ Missing columns! Method:', hasMethod, 'ClassID:', hasClassId);
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err.message);
        process.exit(1);
    }
}

checkAttendanceSchema();
