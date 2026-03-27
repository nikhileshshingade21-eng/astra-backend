const { Client } = require('pg');
require('dotenv').config();

async function seedBranch(name, rollNumbers) {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: false
    });

    try {
        await client.connect();
        console.log(`--- Seeding Branch: ${name} (${rollNumbers.length} students) ---`);
        for (const roll of rollNumbers) {
            await client.query('INSERT INTO verified_students (roll_number) VALUES ($1) ON CONFLICT (roll_number) DO NOTHING', [roll.toUpperCase()]);
        }
        console.log(`✅ ${name} Done.`);
        await client.end();
    } catch (e) {
        console.error(`❌ Failed seeding ${name}:`, e.message);
        await client.end();
    }
}

const cscRolls = [
    "25N81A6201", "25N81A6202", "25N81A6203", "25N81A6204", "25N81A6205", "25N81A6206", "25N81A6207", "25N81A6208", 
    "25N81A6209", "25N81A6210", "25N81A6211", "25N81A6212", "25N81A6213", "25N81A6214", "25N81A6215", "25N81A6216", 
    "25N81A6217", "25N81A6218", "25N81A6219", "25N81A6220", "25N81A6221", "25N81A6222", "25N81A6223", "25N81A6224", 
    "25N81A6225", "25N81A6226", "25N81A6227", "25N81A6228", "25N81A6229", "25N81A6230", "25N81A6231", "25N81A6232", 
    "25N81A6233", "25N81A6234", "25N81A6235", "25N81A6236", "25N81A6237", "25N81A6238", "25N81A6239", "25N81A6240", 
    "25N81A6241", "25N81A6242", "25N81A6243", "25N81A6244", "25N81A6245", "25N81A6246", "25N81A6247", "25N81A6248", 
    "25N81A6249", "25N81A6250", "25N81A6251", "25N81A6252", "25N81A6253", "25N81A6254", "25N81A6255", "25N81A6256", 
    "25N81A6257", "25N81A6258", "25N81A6259", "25N81A6260", "25N81A6261", "25N81A6262", "25N81A6263", "25N81A6264"
];

const eceRolls = [
    "25N81A0401", "25N81A0402", "25N81A0403", "25N81A0404", "25N81A0405", "25N81A0406", "25N81A0407", "25N81A0408", 
    "25N81A0409", "25N81A0410", "25N81A0411", "25N81A0412", "25N81A0413", "25N81A0414", "25N81A0415", "25N81A0416", 
    "25N81A0417", "25N81A0418", "25N81A0419", "25N81A0420", "25N81A0421", "25N81A0422", "25N81A0423", "25N81A0424", 
    "25N81A0425", "25N81A0426", "25N81A0427", "25N81A0428", "25N81A0429", "25N81A0430"
];

const civilRolls = [
    "25N81A0101", "25N81A0102", "25N81A0103", "25N81A0104", "25N81A0105", "25N81A0106", "25N81A0107", "25N81A0108", 
    "25N81A0109", "25N81A0110", "25N81A0111", "25N81A0112", "25N81A0113", "25N81A0114", "25N81A0115", "25N81A0116"
];

async function run() {
    await seedBranch('CSC', cscRolls);
    await seedBranch('ECE', eceRolls);
    await seedBranch('CIVIL', civilRolls);
}

run();
