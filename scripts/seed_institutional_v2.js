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
        console.log('--- ASTRA Institutional Master Seed v2 ---');

        // 1. Clear ALL existing classes to start fresh
        await pool.query("DELETE FROM classes");
        console.log('✓ Cleared all existing timetable data.');

        // 2. Identify Zone (Room 214 as default for this batch)
        const zoneRes = await pool.query("SELECT id FROM campus_zones WHERE name LIKE '%Main%' LIMIT 1");
        const zoneId = zoneRes.rows.length > 0 ? zoneRes.rows[0].id : 1;

        // 3. Define Timetable Templates
        
        const csTemplate = [
            { day: 'Monday', code: 'AEP', name: 'Advanced English', faculty: 'Mrs. T Sreevani', room: '214', start: '09:00', end: '10:00' },
            { day: 'Monday', code: 'LBP', name: 'Logic Based Programming', faculty: 'Mr. T Balachary', room: '214', start: '10:10', end: '12:10' },
            { day: 'Monday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '12:50', end: '13:50' },
            { day: 'Monday', code: 'BEE LAB', name: 'Basic Electrical Eng. Lab', faculty: 'Dr. M Narendar Reddy', room: 'BEE LAB', start: '13:50', end: '16:00' },
            { day: 'Tuesday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '09:00', end: '10:00' },
            { day: 'Tuesday', code: 'PYTHON LAB', name: 'Python Programming Lab', faculty: 'Mr. Surya Narayana', room: 'G-15', start: '10:10', end: '12:10' },
            { day: 'Tuesday', code: 'AEP', name: 'Advanced English', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
            { day: 'Tuesday', code: 'ODEVC', name: 'Ordinary Diff. Equations', faculty: 'Mrs. A Swarnalatha', room: '214', start: '13:50', end: '14:50' },
            { day: 'Wednesday', code: 'SOFT SKILLS', name: 'Soft Skills Training', faculty: 'Atoshi Roy', room: '214', start: '09:00', end: '12:10' },
            { day: 'Wednesday', code: 'BEE', name: 'Basic Electrical Eng.', faculty: 'Dr. M Narendar Reddy', room: '214', start: '12:50', end: '13:50' },
            { day: 'Wednesday', code: 'AEP LAB', name: 'English Lab', faculty: 'Mrs. T Sreevani', room: 'AEP LAB', start: '13:50', end: '16:00' },
            { day: 'Thursday', code: 'ITWS', name: 'IT Workshop', faculty: 'Mr. Trishank', room: 'G-15', start: '09:00', end: '11:10' },
            { day: 'Thursday', code: 'ODEVC', name: 'Ordinary Diff. Equations', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
            { day: 'Thursday', code: 'AEP', name: 'Advanced English', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
            { day: 'Friday', code: 'EDCAD', name: 'Eng. Drawing & CAD', faculty: 'Dr. K Govardhan Reddy', room: '321', start: '09:00', end: '10:00' },
            { day: 'Friday', code: 'BEE', name: 'Basic Electrical Eng.', faculty: 'Dr. M Narendar Reddy', room: '214', start: '10:10', end: '11:10' },
            { day: 'Friday', code: 'ODEVC', name: 'Ordinary Diff. Equations', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
            { day: 'Friday', code: 'DS LAB', name: 'Data Structures Lab', faculty: 'Mr. K Praveen Kumar', room: '220', start: '13:50', end: '16:00' },
            { day: 'Saturday', code: 'EDCAD', name: 'Eng. Drawing & CAD', faculty: 'Dr. K Govardhan Reddy', room: '320', start: '09:00', end: '11:10' },
            { day: 'Saturday', code: 'ODEVC', name: 'Ordinary Diff. Equations', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' }
        ];

        const dsTemplate = [
            { day: 'Monday', code: 'SOFT SKILLS', name: 'Soft Skills', faculty: 'Atoshi Roy', room: '314', start_time: '09:00', end_time: '12:10' },
            { day: 'Monday', code: 'ODEVC', name: 'ODEVC', faculty: 'Dr. MD Ahmed', room: '314', start_time: '12:50', end_time: '13:50' },
            { day: 'Monday', code: 'DS LAB', name: 'DS Lab', faculty: 'Mr. Afzal', room: '320', start_time: '13:50', end_time: '16:00' },
            { day: 'Tuesday', code: 'EDC', name: 'EDC', faculty: 'Mrs Priya', room: '314', start_time: '09:00', end_time: '10:00' },
            { day: 'Tuesday', code: 'ODEVC', name: 'ODEVC', faculty: 'Dr. MD Ahmed', room: '314', start_time: '10:10', end_time: '11:10' },
            { day: 'Tuesday', code: 'EC', name: 'EC', faculty: 'Mrs. D Nalini', room: '314', start_time: '11:10', end_time: '12:10' },
            { day: 'Tuesday', code: 'DS', name: 'DS', faculty: 'Mr. Afzal', room: '314', start_time: '12:50', end_time: '13:50' },
            { day: 'Tuesday', code: 'EC LAB', name: 'EC Lab', faculty: 'Mrs. D Nalini', room: '314', start_time: '13:50', end_time: '16:00' }
        ];

        const aiml1Template = [
            { day: 'Monday', code: 'DS', name: 'DS', faculty: 'Mr. MD Afzal', room: '302', start_time: '09:00', end_time: '10:00' },
            { day: 'Monday', code: 'EDC', name: 'EDC', faculty: 'Ms. Priya', room: '302', start_time: '10:10', end_time: '11:10' },
            { day: 'Monday', code: 'ODEVC', name: 'ODEVC', faculty: 'Dr. MD Ahmed', room: '302', start_time: '11:10', end_time: '12:10' },
            { day: 'Monday', code: 'EC', name: 'EC', faculty: 'Dr. D Appa Rao', room: '302', start_time: '12:50', end_time: '13:50' }
        ];

        const cseTemplate = [
            { day: 'Monday', code: 'AEP', name: 'AEP', faculty: 'Dr. P Gayatri', room: '202', start_time: '09:00', end_time: '10:00' },
            { day: 'Monday', code: 'ODEVC', name: 'ODEVC', faculty: 'Dr. MD Ahmed', room: '202', start_time: '10:10', end_time: '11:10' },
            { day: 'Monday', code: 'ITWS', name: 'IT Workshop', faculty_name: 'Mr. Trishank', room: '220', start_time: '11:10', end_time: '13:50' }
        ];

        // 4. Mapping Configurations
        const mappings = [
            { prog: 'B.Tech CSC', sections: ['CS', 'S1'], template: csTemplate },
            { prog: 'B.Tech CSD', sections: ['D1', 'D2', 'D3'], template: dsTemplate },
            { prog: 'B.Tech AIML', sections: ['A1', 'A2', 'A3', 'A4', 'A5'], template: aiml1Template },
            { prog: 'B.Tech CSE', sections: ['C1', 'C2', 'C3', 'C4', 'C5'], template: cseTemplate },
            { prog: 'B.Tech ECE', sections: ['ECE', 'E1'], template: cseTemplate }, // Fallback to CSE template
            { prog: 'B.Tech CIVIL', sections: ['CIV', 'V1'], template: csTemplate } // Fallback to CS template
        ];

        let count = 0;
        for (const m of mappings) {
            for (const section of m.sections) {
                for (const c of m.template) {
                    await pool.query(`
                        INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section, zone_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [
                        c.code, 
                        c.name || c.code, 
                        c.faculty || c.faculty_name || 'TBA', 
                        c.room || 'TBA', 
                        c.day, 
                        c.start || c.start_time, 
                        c.end || c.end_time, 
                        m.prog, 
                        section, 
                        zoneId
                    ]);
                    count++;
                }
            }
        }

        console.log(`✅ Successfully seeded ${count} classes for Institutional Rollout.`);
        
    } catch (err) {
        console.error('❌ Failed to seed institutional timetable:', err.message);
    } finally {
        await pool.end();
    }
}

seed();
