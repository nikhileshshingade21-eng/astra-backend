require('dotenv').config();
const bcrypt = require('bcryptjs');
const { queryAll } = require('./database_module.js');

async function seed() {
    console.log('Seeding Staff Accounts...');
    const passwordHash = await bcrypt.hash('password123', 10);

    try {
        // 1. Seed Verified Registry
        console.log('Inserting into verified_students...');
        await queryAll(
            'INSERT INTO verified_students (roll_number, name, department) VALUES ($1, $2, $3), ($4, $5, $6) ON CONFLICT DO NOTHING',
            ['FAC001', 'Prof. Faculty One', 'Computer Science', 'ADM999', 'System Administrator', 'Operations']
        );

        // 2. Insert into Users with correct roles
        console.log('Inserting into users...');
        await queryAll(
            `INSERT INTO users (roll_number, name, password_hash, role, is_registered, programme, section) 
             VALUES ($1, $2, $3, $4, TRUE, $5, $6), ($7, $8, $9, $10, TRUE, $11, $12)
             ON CONFLICT (roll_number) DO UPDATE SET role = EXCLUDED.role, is_registered = TRUE`,
            [
                'FAC001', 'Prof. Faculty One', passwordHash, 'faculty', 'B.Tech CSC', 'CS',
                'ADM999', 'System Administrator', passwordHash, 'admin', 'ALL', 'ALL'
            ]
        );

        console.log('✅ Staff Seeding Complete!');
        console.log('Faculty: FAC001 / password123');
        console.log('Admin: ADM999 / password123');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Error:', err.message);
        process.exit(1);
    }
}

seed();
