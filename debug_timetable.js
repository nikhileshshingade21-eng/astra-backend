require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function debugTimetable() {
    try {
        const roll = '25N81A6243';
        const user = await queryAll('SELECT id, roll_number, name, programme, section FROM users WHERE roll_number = $1', [roll]);
        console.log('User found:', user[0]);

        if (user.length > 0) {
            const { programme, section } = user[0];
            const day = 'Tuesday';
            
            console.log(`\nChecking classes for Day: ${day}, Programme: ${programme}, Section: ${section}...`);
            
            const classesAll = await queryAll('SELECT * FROM classes');
            console.log(`Total classes in DB: ${classesAll.length}`);

            const classesToday = await queryAll(
                'SELECT * FROM classes WHERE day = $1 AND programme = $2 AND section = $3',
                [day, programme, section]
            );
            console.log(`Classes for ${roll} today: ${classesToday.length}`);
            classesToday.forEach(c => console.log(`- ${c.name} (${c.start_time} - ${c.end_time})`));

            const distinctDays = await queryAll('SELECT DISTINCT day FROM classes');
            console.log(`\nDays with classes in DB:`, distinctDays.map(d => d.day));

            const distinctProgrammes = await queryAll('SELECT DISTINCT programme FROM classes');
            console.log(`Programmes in DB:`, distinctProgrammes.map(p => p.programme));

            const distinctSections = await queryAll('SELECT DISTINCT section FROM classes');
            console.log(`Sections in DB:`, distinctSections.map(s => s.section));
        }
    } catch (err) {
        console.error('Debug error:', err.message);
    } finally {
        process.exit();
    }
}

debugTimetable();
