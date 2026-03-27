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
        for (let i = 0; i < rollNumbers.length; i += 50) {
            const batch = rollNumbers.slice(i, i + 50);
            const values = batch.map((r, idx) => `($${idx + 1})`).join(',');
            await client.query(`INSERT INTO verified_students (roll_number) VALUES ${values} ON CONFLICT (roll_number) DO NOTHING`, batch);
        }
        console.log(`✅ ${name} Done.`);
        await client.end();
    } catch (e) {
        console.error(`❌ Failed seeding ${name}:`, e.message);
        await client.end();
    }
}

// CSD D Roll Numbers
const csdRolls = [
    "25N81A6701", "25N81A6702", "25N81A6703", "25N81A6704", "25N81A6705", "25N81A6706", "25N81A6707", "25N81A6708", "25N81A6709", "25N81A6710",
    "25N81A6711", "25N81A6712", "25N81A6713", "25N81A6714", "25N81A6715", "25N81A6716", "25N81A6717", "25N81A6718", "25N81A6719", "25N81A6720",
    "25N81A6721", "25N81A6722", "25N81A6723", "25N81A6724", "25N81A6725", "25N81A6726", "25N81A6727", "25N81A6728", "25N81A6729", "25N81A6730",
    "25N81A6731", "25N81A6732", "25N81A6733", "25N81A6734", "25N81A6735", "25N81A6736", "25N81A6737", "25N81A6738", "25N81A6739", "25N81A6740",
    "25N81A6741", "25N81A6742", "25N81A6743", "25N81A6744", "25N81A6745", "25N81A6746", "25N81A6747", "25N81A6748", "25N81A6749", "25N81A6750",
    "25N81A6751", "25N81A6752", "25N81A6753", "25N81A6754", "25N81A6756", "25N81A6757", "25N81A6758", "25N81A6759", "25N81A6760", "25N81A6761",
    "25N81A6762", "25N81A6763", "25N81A6764", "25N81A6765", "25N81A6766", "25N81A6767", "25N81A6768", "25N81A6769", "25N81A6770", "25N81A6771",
    "25N81A6772", "25N81A6773", "25N81A6774", "25N81A6775", "25N81A6776", "25N81A6777", "25N81A6779", "25N81A6780", "25N81A6781", "25N81A6782",
    "25N81A6783", "25N81A6784", "25N81A6785", "25N81A6787", "25N81A6788", "25N81A6789", "25N81A6790", "25N81A6792", "25N81A6793", "25N81A6794",
    "25N81A6796", "25N81A6798", "25N81A6799", "25N81A67A0", "25N81A67A1", "25N81A67A2", "25N81A67A3", "25N81A67A4", "25N81A67A5", "25N81A67A6",
    "25N81A67A7", "25N81A67A8", "25N81A67A9", "25N81A67B0", "25N81A67B1", "25N81A67B2", "25N81A67B3", "25N81A67B4", "25N81A67B5", "25N81A67B6",
    "25N81A67B7", "25N81A67B8", "25N81A67C0", "25N81A67C1", "25N81A67C2", "25N81A67C3", "25N81A67C4", "25N81A67C5", "25N81A67C6", "25N81A67C7",
    "25N81A67C8", "25N81A67C9", "25N81A67D0", "25N81A67D1", "25N81A67D2", "25N81A67D4", "25N81A67D5", "25N81A67D7", "25N81A67D8", "25N81A67E0",
    "25N81A67E1", "25N81A67E2", "25N81A67E3", "25N81A67E4", "25N81A67E5", "25N81A67E6", "25N81A67E7", "25N81A67E8", "25N81A67F0", "25N81A67F1",
    "25N81A67F2", "25N81A67F3", "25N81A67F4", "25N81A67F5", "25N81A67F6", "25N81A67F7", "25N81A67F8"
];

seedBranch('CSD', csdRolls).then(() => process.exit(0));
