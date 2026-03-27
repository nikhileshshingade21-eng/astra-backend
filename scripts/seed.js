const { queryAll } = require('../database_module');

async function seedData() {
    console.log('--- Starting Seeding (PostgreSQL) ---');

    // 1. Add Campus Zone (Using User's current coordinates from screenshot)
    console.log('Seeding Campus Zone...');
    await queryAll(`INSERT INTO campus_zones (id, name, lat, lng, radius_m) 
            VALUES (1, 'Main Campus', 17.281, 78.548, 200)
            ON CONFLICT (id) DO NOTHING`);

    // 2. Add Classes for Tuesday (Today)
    console.log('Seeding Classes...');
    const day = 'Tuesday';

    const classes = [
        { code: 'CS301', name: 'Software Engineering', room: 'LH-1', start: '09:00', end: '10:00' },
        { code: 'CS302', name: 'Database Systems', room: 'LH-2', start: '10:30', end: '11:45' },
        { code: 'HU101', name: 'Professional Ethics', room: 'AUD-1', start: '13:00', end: '14:30' },
        { code: 'CS305', name: 'Computer Networks', room: 'LAB-4', start: '15:00', end: '17:00' }
    ];

    for (const c of classes) {
        await queryAll(`INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT DO NOTHING`,
            [c.code, c.name, 'Dr. Smith', c.room, day, c.start, c.end, 'B.Tech CSE', 'A']);
    }

    // 3. Add initial notification
    console.log('Seeding Notification...');
    // We'll try for ID 1 (Assuming a user exists)
    try {
        await queryAll(`INSERT INTO notifications (user_id, title, message, type) 
                VALUES (1, 'System Ready', 'Your schedule and campus zones have been loaded.', 'success')`);
    } catch(e) {
        console.log('Notification seed skipped (User 1 might not exist yet).');
    }

    console.log('--- Seeding Complete ! ---');
}

seedData().catch(err => {
    console.error('Seed Error:', err);
});
