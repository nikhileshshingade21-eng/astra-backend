const { Pool } = require('pg');
require('dotenv').config();

async function seed() {
    let connectionStr = process.env.DATABASE_URL;
    if (!connectionStr && process.env.DB_HOST) {
        connectionStr = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    }

    const pool = new Pool({
        connectionString: connectionStr,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- ASTRA Official Timetable Seeding (CS Department) ---');

        // 1. Reset existing classes for this section to prevent duplicates
        await pool.query("DELETE FROM classes WHERE section = 'CS'");
        console.log('✓ Cleared old CS timetable data.');

        // 2. Identify Zone (All in Room 214 / Main Block for now)
        const zoneRes = await pool.query("SELECT id FROM campus_zones WHERE name LIKE '%Main%' LIMIT 1");
        const zoneId = zoneRes.rows.length > 0 ? zoneRes.rows[0].id : null;

        const programme = 'B.Tech CSC';
        const section = 'CS';

        // 3. Timetable Data Structure
        const schedule = [
            // MONDAY
            { day: 'Monday', code: 'AEP', name: 'Advanced English', faculty: 'Mrs. T Sreevani', room: '214', start: '09:00', end: '10:00' },
            { day: 'Monday', code: 'LBP', name: 'Logic Based Programming', faculty: 'Mr. T Balachary', room: '214', start: '10:10', end: '12:10' },
            { day: 'Monday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '12:50', end: '01:50' },
            { day: 'Monday', code: 'BEE LAB', name: 'Basic Electrical Eng. Lab', faculty: 'Dr. M Narendar Reddy', room: 'BEE LAB', start: '01:50', end: '04:00' },

            // TUESDAY
            { day: 'Tuesday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '09:00', end: '10:00' },
            { day: 'Tuesday', code: 'PYTHON LAB', name: 'Python Programming Lab', faculty: 'Mr. Surya Narayana', room: 'G-15', start: '10:10', end: '12:10' },
            { day: 'Tuesday', code: 'AEP', name: 'Advanced English', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '01:50' },
            { day: 'Tuesday', code: 'ODEVC', name: 'Ordinary Diff. Equations', faculty: 'Mrs. A Swarnalatha', room: '214', start: '01:50', end: '02:50' },
            { day: 'Tuesday', code: 'LIB', name: 'Library', faculty: 'Librarian', room: 'Library', start: '03:00', end: '04:00' },

            // WEDNESDAY
            { day: 'Wednesday', code: 'SOFT SKILLS', name: 'Soft Skills Training', faculty: 'Akushi Roy', room: '214', start: '09:00', end: '12:10' },
            { day: 'Wednesday', code: 'BEE', name: 'Basic Electrical Eng.', faculty: 'Dr. M Narendar Reddy', room: '214', start: '12:50', end: '01:50' },
            { day: 'Wednesday', code: 'AEP LAB', name: 'English Lab', faculty: 'Mrs. T Sreevani', room: 'AEP LAB', start: '01:50', end: '04:00' },

            // THURSDAY
            { day: 'Thursday', code: 'ITWS', name: 'IT Workshop', faculty: 'Mr. Trishank', room: 'G-15', start: '09:00', end: '11:10' },
            { day: 'Thursday', code: 'ODEVC', name: 'Ordinary Diff. Equations', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
            { day: 'Thursday', code: 'AEP', name: 'Advanced English', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '01:50' },
            { day: 'Thursday', code: 'BEE', name: 'Basic Electrical Eng.', faculty: 'Dr. M Narendar Reddy', room: '214', start: '01:50', end: '02:50' },
            { day: 'Thursday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '03:00', end: '04:00' },

            // FRIDAY
            { day: 'Friday', code: 'EDCAD', name: 'Eng. Drawing & CAD', faculty: 'Dr. K Govardhan Reddy', room: '321', start: '09:00', end: '10:00' },
            { day: 'Friday', code: 'BEE', name: 'Basic Electrical Eng.', faculty: 'Dr. M Narendar Reddy', room: '214', start: '10:10', end: '12:10' },
            { day: 'Friday', code: 'AEP', name: 'Advanced English', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '01:50' },
            { day: 'Friday', code: 'DS LAB', name: 'Data Structures Lab', faculty: 'Mr. K Praveen Kumar', room: '120', start: '01:50', end: '04:00' },

            // SATURDAY
            { day: 'Saturday', code: 'EDCAD', name: 'Eng. Drawing & CAD', faculty: 'Dr. K Govardhan Reddy', room: '321', start: '09:00', end: '11:10' },
            { day: 'Saturday', code: 'ODEVC', name: 'Ordinary Diff. Equations', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
            { day: 'Saturday', code: 'SPORTS', name: 'Sports Area', faculty: 'Coach', room: 'Ground', start: '12:50', end: '01:50' },
            { day: 'Saturday', code: 'SSLITE', name: 'Self Study / Lite Session', faculty: 'Self', room: '214', start: '01:50', end: '04:00' }
        ];

        for (const c of schedule) {
            await pool.query(`
                INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section, zone_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [c.code, c.name, c.faculty, c.room, c.day, c.start, c.end, programme, section, zoneId]);
        }

        console.log(`✅ Successfully seeded ${schedule.length} classes for SPHOORTHY CS Dep. (2025-26)`);
        
    } catch (err) {
        console.error('❌ Failed to seed official timetable:', err.message);
    } finally {
        await pool.end();
    }
}

seed();
