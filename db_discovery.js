require('dotenv').config();
const { queryAll } = require('./database_module');

(async () => {
    try {
        const tables = await queryAll("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', tables.map(t => t.table_name).join(', '));
        
        for (const t of ['verified_students', 'users', 'classes']) {
            const columns = await queryAll(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}'`);
            console.log(`\n--- Schema of ${t} ---`);
            console.log(columns.map(c => `${c.column_name} (${c.data_type})`).join(', '));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
})();
