require('dotenv').config();
const { queryAll } = require('./database_module');

async function check() {
    const rows = await queryAll(
        "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('academic_calendar','classes','attendance','users') ORDER BY table_name, ordinal_position"
    );
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}
check();
