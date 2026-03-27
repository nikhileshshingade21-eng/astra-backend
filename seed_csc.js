const { queryAll } = require('./database_module.js');

async function seedCSC() {
    const rollNumbers = [
        "25N81A6201", "25N81A6202", "25N81A6203", "25N81A6204", "25N81A6205", "25N81A6206", "25N81A6207", "25N81A6208", 
        "25N81A6209", "25N81A6210", "25N81A6211", "25N81A6212", "25N81A6213", "25N81A6214", "25N81A6215", "25N81A6216", 
        "25N81A6217", "25N81A6218", "25N81A6219", "25N81A6220", "25N81A6221", "25N81A6222", "25N81A6223", "25N81A6224", 
        "25N81A6225", "25N81A6226", "25N81A6227", "25N81A6228", "25N81A6229", "25N81A6230", "25N81A6231", "25N81A6232", 
        "25N81A6233", "25N81A6234", "25N81A6235", "25N81A6236", "25N81A6237", "25N81A6238", "25N81A6239", "25N81A6240", 
        "25N81A6241", "25N81A6242", "25N81A6243", "25N81A6244", "25N81A6245", "25N81A6246", "25N81A6247", "25N81A6248", 
        "25N81A6249", "25N81A6250", "25N81A6251", "25N81A6252", "25N81A6253", "25N81A6254", "25N81A6255", "25N81A6256", 
        "25N81A6257", "25N81A6258", "25N81A6259", "25N81A6260", "25N81A6261", "25N81A6262", "25N81A6263", "25N81A6264"
    ];

    console.log(`Seeding ${rollNumbers.length} CSC students...`);
    for (const roll of rollNumbers) {
        try {
            await queryAll('INSERT INTO verified_students (roll_number) VALUES ($1) ON CONFLICT (roll_number) DO NOTHING', [roll]);
        } catch (e) {
            console.error(`Failed to seed ${roll}:`, e.message);
        }
    }
    console.log('CSC Seeding Done.');
    process.exit(0);
}

seedCSC();
