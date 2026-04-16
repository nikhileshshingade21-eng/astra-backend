require('dotenv').config();
const { queryAll } = require('./database_module');

(async () => {
    try {
        const schema = await queryAll("SELECT column_name FROM information_schema.columns WHERE table_name = 'verified_students'");
        console.log('Columns in verified_students:', schema.map(c => c.column_name).join(', '));
        
        const row = await queryAll("SELECT * FROM verified_students LIMIT 1");
        console.log('Example row:', JSON.stringify(row, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
})();
