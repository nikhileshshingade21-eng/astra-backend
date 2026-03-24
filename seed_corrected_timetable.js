const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

const PROGRAMME = 'B.Tech CSC';
const SECTION = 'CS';

const schedule = [
    // MON
    { day: 'Monday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '09:00', end: '10:00' },
    { day: 'Monday', code: 'LBP', name: 'Logic Based Programming', faculty: 'Mr. T Balachary', room: '214', start: '10:10', end: '12:10' },
    { day: 'Monday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '12:50', end: '13:50' },
    { day: 'Monday', code: 'BEE-LAB', name: 'BEE Lab', faculty: 'Dr. M Narendar Reddy / Mr. D Madhu', room: '214', start: '13:50', end: '16:00' },

    // TUE
    { day: 'Tuesday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '09:00', end: '10:00' },
    { day: 'Tuesday', code: 'PYTHON-LAB', name: 'Python Lab', faculty: 'Mr. Surya Narayana', room: 'G-15', start: '10:10', end: '12:10' },
    { day: 'Tuesday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
    { day: 'Tuesday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '13:50', end: '14:50' },
    { day: 'Tuesday', code: 'LIBRARY', name: 'Library', faculty: 'Self Study', room: 'Library', start: '15:00', end: '16:00' },

    // WED
    { day: 'Wednesday', code: 'SOFT-SKILLS', name: 'Soft Skills', faculty: 'Atoshi Roy', room: '214', start: '09:00', end: '12:10' },
    { day: 'Wednesday', code: 'BEE', name: 'Basic Electrical Engineering', faculty: 'Dr. M Narendar Reddy', room: '214', start: '12:50', end: '13:50' },
    { day: 'Wednesday', code: 'AEP-LAB', name: 'AEP Lab', faculty: 'Mrs. T Sreevani / Mr. A Sandeep', room: '214', start: '13:50', end: '16:00' },

    // THU
    { day: 'Thursday', code: 'ITWS', name: 'IT Workshop', faculty: 'Mr. Trishank', room: 'G-15', start: '09:00', end: '11:10' },
    { day: 'Thursday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
    { day: 'Thursday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
    { day: 'Thursday', code: 'BEE', name: 'Basic Electrical Engineering', faculty: 'Dr. M Narendar Reddy', room: '214', start: '13:50', end: '14:50' },
    { day: 'Thursday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '15:00', end: '16:00' },

    // FRI
    { day: 'Friday', code: 'EDCAD', name: 'Engineering Drawing & CAD', faculty: 'Dr. K Govardhan Reddy / Mr. B Naga Murali', room: '214', start: '09:00', end: '10:00' },
    { day: 'Friday', code: 'BEE', name: 'Basic Electrical Engineering', faculty: 'Dr. M Narendar Reddy', room: '214', start: '10:10', end: '11:10' },
    { day: 'Friday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
    { day: 'Friday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
    { day: 'Friday', code: 'BEE', name: 'Basic Electrical Engineering', faculty: 'Dr. M Narendar Reddy', room: '214', start: '13:50', end: '14:50' },
    { day: 'Friday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '15:00', end: '16:00' },

    // SAT
    { day: 'Saturday', code: 'EDCAD', name: 'Engineering Drawing & CAD', faculty: 'Dr. K Govardhan Reddy / Mr. B Naga Murali', room: '320', start: '09:00', end: '11:10' },
    { day: 'Saturday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
    { day: 'Saturday', code: 'SPORTS', name: 'Sports', faculty: 'Sports Incharge', room: 'Ground', start: '12:50', end: '13:50' },
    { day: 'Saturday', code: 'DS-LAB', name: 'DS Lab', faculty: 'Mr. K Praveen Kumar', room: '220', start: '13:50', end: '16:00' }
];

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('Cleaning existing timetable for CS...');
        await client.query('DELETE FROM classes WHERE programme = $1 AND section = $2', [PROGRAMME, SECTION]);

        console.log('Inserting corrected schedule...');
        for (const c of schedule) {
            await client.query(
                `INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [c.code, c.name, c.faculty, c.room, c.day, c.start, c.end, PROGRAMME, SECTION]
            );
        }

        await client.query('COMMIT');
        console.log('SUCCESS: Timetable updated successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during seeding:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
