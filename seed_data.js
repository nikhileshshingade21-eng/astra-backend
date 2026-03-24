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
        console.log('Seeding Campus Zones and CS Timetable...');

        // 1. Create a Campus Zone at the user's current location (from screenshot)
        const zoneRes = await pool.query(`
            INSERT INTO campus_zones (name, lat, lng, radius_m) 
            VALUES ($1, $2, $3, $4) RETURNING id
        `, ['Main Block (CS)', 17.281014, 78.548633, 50]);
        const zoneId = zoneRes.rows[0].id;

        // 2. Create sample CS classes for Tuesday (Today)
        const classes = [
            { code: 'CS101', name: 'Data Structures', faculty: 'Dr. Smith', room: 'Lab 1', start: '09:00', end: '10:30' },
            { code: 'CS102', name: 'Operating Systems', faculty: 'Prof. Johnson', room: 'Room 302', start: '10:45', end: '12:15' },
            { code: 'CS103', name: 'Discrete Math', faculty: 'Dr. Brown', room: 'Hall A', start: '13:00', end: '14:30' },
            { code: 'CS104', name: 'Web Dev', faculty: 'Prof. Miller', room: 'Lab 4', start: '14:45', end: '16:15' }
        ];

        for (const c of classes) {
            await pool.query(`
                INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section, zone_id)
                VALUES ($1, $2, $3, $4, 'Tuesday', $5, $6, 'B.Tech CSC', 'CS', $7)
            `, [c.code, c.name, c.faculty, c.room, c.start, c.end, zoneId]);
        }

        console.log('✅ Seed successful! 4 classes added for Tuesday (B.Tech CSC / CS).');
        
    } catch (err) {
        console.error('❌ Failed to seed data:', err.message);
    } finally {
        await pool.end();
    }
}

seed();
