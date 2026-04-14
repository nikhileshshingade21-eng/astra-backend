require('dotenv').config();
const { queryAll } = require('./database_module');

async function diagnose() {
    console.log("=== 1. Academic Calendar Events ===");
    const events = await queryAll("SELECT event_name, start_date, end_date, type, is_system_holiday FROM academic_calendar ORDER BY start_date");
    console.log(JSON.stringify(events, null, 2));

    console.log("\n=== 2. Classes for B.Tech CSC / Section CS ===");
    const classes = await queryAll(
        "SELECT day, name, start_time, end_time, room, programme, section FROM classes WHERE LOWER(programme) LIKE '%csc%' OR LOWER(section) = 'cs' ORDER BY day, start_time"
    );
    console.log(`Found ${classes.length} classes`);
    if (classes.length > 0) {
        // Group by day
        const grouped = {};
        classes.forEach(c => { 
            if (!grouped[c.day]) grouped[c.day] = [];
            grouped[c.day].push(`${c.name} ${c.start_time}-${c.end_time} (${c.room})`);
        });
        console.log(JSON.stringify(grouped, null, 2));
    }

    console.log("\n=== 3. Testing calendar BETWEEN for Wed Apr 15 ===");
    const test = await queryAll(
        "SELECT event_name, start_date, end_date FROM academic_calendar WHERE '2026-04-15' BETWEEN start_date AND end_date"
    );
    console.log("Events matching Apr 15:", JSON.stringify(test));

    console.log("\n=== 4. Testing calendar BETWEEN for today Apr 14 ===");
    const test2 = await queryAll(
        "SELECT event_name, start_date, end_date FROM academic_calendar WHERE '2026-04-14' BETWEEN start_date AND end_date"
    );
    console.log("Events matching Apr 14:", JSON.stringify(test2));

    process.exit(0);
}
diagnose();
