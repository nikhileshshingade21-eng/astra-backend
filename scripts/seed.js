const { getDb, saveDb } = require('../db');

async function seedData() {
    console.log('--- Starting Seeding ---');
    const db = await getDb();

    // 1. Add Campus Zone (Using User's current coordinates from screenshot)
    console.log('Seeding Campus Zone...');
    db.run(`INSERT OR IGNORE INTO campus_zones (id, name, lat, lng, radius_m) 
            VALUES (1, 'Main Campus', 17.281, 78.548, 200)`);

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
        db.run(`INSERT OR IGNORE INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [c.code, c.name, 'Dr. Smith', c.room, day, c.start, c.end, 'B.Tech CSE', 'A']);
    }

    // 3. Add initial notification
    console.log('Seeding Notification...');
    // We don't have user IDs yet, but we'll try for ID 1
    db.run(`INSERT INTO notifications (user_id, title, message, type) 
            VALUES (1, 'System Ready', 'Your schedule and campus zones have been loaded.', 'success')`);

    saveDb();
    console.log('--- Seeding Complete ! ---');
}

seedData().catch(err => {
    console.error('Seed Error:', err);
});
