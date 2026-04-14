require('dotenv').config();
const { queryAll } = require('./database_module');

async function testSchedule() {
    // Simulate what the timetable controller does for Wednesday
    const targetDayName = 'Wednesday';
    const programme = 'B.Tech CSC';
    const section = 'CS';

    console.log(`\n=== Simulating timetableController for ${targetDayName} ===`);
    console.log(`Programme: ${programme} | Section: ${section}`);

    // This is the EXACT query from the controller
    const result = await queryAll(
        `SELECT c.id, c.code, c.name, c.faculty_name, c.room, c.start_time, c.end_time, c.section, c.programme
         FROM classes c
         WHERE TRIM(LOWER(c.day)) = TRIM(LOWER($1))
         AND (
             TRIM(LOWER(c.section)) = TRIM(LOWER($2))
             OR 
             (
                 TRIM(LOWER(c.programme)) = TRIM(LOWER($3)) 
                 AND (c.section IS NULL OR c.section = '' OR c.section = 'all' OR c.section = 'CS')
             )
         )
         ORDER BY c.start_time`,
        [targetDayName, section, programme]
    );

    console.log(`Query returned: ${result.length} classes`);
    result.forEach(c => console.log(`  - ${c.name} | ${c.start_time}-${c.end_time} | Room: ${c.room} | Section: ${c.section} | Prog: ${c.programme}`));

    // Check what we get for calendar on Apr 15
    console.log(`\n=== Calendar check for 2026-04-15 ===`);
    const cal = await queryAll(
        'SELECT event_name, type, is_system_holiday FROM academic_calendar WHERE $1 BETWEEN start_date AND end_date LIMIT 1',
        ['2026-04-15']
    );
    console.log(`Calendar event: ${JSON.stringify(cal)}`);
    console.log(`is_system_holiday: ${cal[0]?.is_system_holiday}`);

    // Check user profile
    console.log(`\n=== User Profile for 25N81A6258 ===`);
    const user = await queryAll("SELECT id, roll_number, programme, section FROM users WHERE roll_number = '25N81A6258'");
    console.log(JSON.stringify(user, null, 2));

    process.exit(0);
}
testSchedule();
