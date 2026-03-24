const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

// REAL Timetable from Sphoorthy Engineering College
// I B.Tech, SEM-II, A.Y 2025-26, Section: CS, Room: 214
// Class Incharges: Mrs. T Sreevani, Dr. M Narendar Reddy

const PROG = 'B.Tech CSC';
const SEC = 'CS';

const timetable = [
    // ===== MONDAY =====
    { day: 'Monday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '09:00 AM', end: '10:00 AM' },
    { day: 'Monday', code: 'LBP', name: 'Logic Based Programming', faculty: 'Mr. T Balachary', room: '214', start: '11:10 AM', end: '12:10 PM' },
    { day: 'Monday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '12:50 PM', end: '01:50 PM' },
    { day: 'Monday', code: 'BEE-LAB', name: 'BEE Lab', faculty: 'Dr. M Narendar Reddy', room: 'BEE Lab', start: '03:00 PM', end: '04:00 PM' },

    // ===== TUESDAY =====
    { day: 'Tuesday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '09:00 AM', end: '10:00 AM' },
    { day: 'Tuesday', code: 'PY-LAB', name: 'Python Lab', faculty: 'Mr. Surya Narayana', room: 'G-15', start: '10:10 AM', end: '12:10 PM' },
    { day: 'Tuesday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50 PM', end: '01:50 PM' },
    { day: 'Tuesday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '01:50 PM', end: '02:50 PM' },
    { day: 'Tuesday', code: 'LIB', name: 'Library', faculty: 'Self Study', room: 'Library', start: '03:00 PM', end: '04:00 PM' },

    // ===== WEDNESDAY =====
    { day: 'Wednesday', code: 'SS', name: 'Soft Skills', faculty: 'Atoshi Roy', room: '214', start: '10:10 AM', end: '12:10 PM' },

    // ===== THURSDAY =====
    { day: 'Thursday', code: 'ITWS', name: 'IT Workshop', faculty: 'Mr. Trishank', room: 'G-15', start: '09:00 AM', end: '11:10 AM' },
    { day: 'Thursday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10 AM', end: '12:10 PM' },
    { day: 'Thursday', code: 'BEE', name: 'Basic Electrical Engineering', faculty: 'Dr. M Narendar Reddy', room: '214', start: '12:50 PM', end: '01:50 PM' },
    { day: 'Thursday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '01:50 PM', end: '02:50 PM' },
    { day: 'Thursday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '03:00 PM', end: '04:00 PM' },

    // ===== FRIDAY =====
    { day: 'Friday', code: 'EDCAD', name: 'Engineering Drawing & CAD', faculty: 'Dr. K Govardhan Reddy', room: '214', start: '09:00 AM', end: '10:00 AM' },
    { day: 'Friday', code: 'BEE', name: 'Basic Electrical Engineering', faculty: 'Dr. M Narendar Reddy', room: '214', start: '10:10 AM', end: '11:10 AM' },
    { day: 'Friday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10 AM', end: '12:10 PM' },
    { day: 'Friday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50 PM', end: '01:50 PM' },
    { day: 'Friday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '03:00 PM', end: '04:00 PM' },

    // ===== SATURDAY =====
    { day: 'Saturday', code: 'EDCAD', name: 'Engineering Drawing & CAD', faculty: 'Dr. K Govardhan Reddy', room: '220', start: '09:00 AM', end: '10:00 AM' },
    { day: 'Saturday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10 AM', end: '12:10 PM' },
    { day: 'Saturday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50 PM', end: '01:50 PM' },
    { day: 'Saturday', code: 'DS-LAB', name: 'DS Lab', faculty: 'Mr. K Praveen Kumar', room: '220', start: '01:50 PM', end: '04:00 PM' },
];

async function seedRealTimetable() {
    try {
        console.log('🏫 Sphoorthy Engineering College — Real Timetable Seed');
        console.log('   Section: CS | Programme: B.Tech CSC | Room: 214\n');

        // Clear ALL existing classes for this section
        const deleted = await pool.query("DELETE FROM classes WHERE section = $1", [SEC]);
        console.log(`🗑️  Cleared ${deleted.rowCount} old classes for section ${SEC}\n`);

        // Insert all real classes
        for (const cls of timetable) {
            await pool.query(
                `INSERT INTO classes (code, name, faculty_name, room, start_time, end_time, day, programme, section)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [cls.code, cls.name, cls.faculty, cls.room, cls.start, cls.end, cls.day, PROG, SEC]
            );
        }

        console.log(`✅ Seeded ${timetable.length} classes across all days:\n`);

        // Verify per day
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (const day of days) {
            const rows = await pool.query("SELECT name, start_time, end_time, room, faculty_name FROM classes WHERE day = $1 AND section = $2 ORDER BY start_time", [day, SEC]);
            console.log(`📅 ${day} (${rows.rows.length} classes):`);
            rows.rows.forEach(c => console.log(`   ${c.start_time} - ${c.end_time} | ${c.name} | ${c.faculty_name} | Room ${c.room}`));
            console.log('');
        }

        console.log('🎉 DONE! Real timetable is now live in production!');
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

seedRealTimetable();
