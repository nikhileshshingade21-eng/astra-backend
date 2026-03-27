require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function debugStrings() {
    try {
        const user = await queryAll("SELECT programme, section FROM users WHERE roll_number = '25N81A6243'");
        if (user.length > 0) {
            const up = user[0].programme;
            const us = user[0].section;
            console.log(`User Programme: [${up}] (Length: ${up.length})`);
            console.log(`User Section: [${us}] (Length: ${us.length})`);
            
            const classes = await queryAll("SELECT DISTINCT programme, section FROM classes");
            console.log('\nClasses in DB:');
            classes.forEach(c => {
                console.log(`- Programme: [${c.programme}] (Length: ${c.programme.length}), Section: [${c.section}] (Length: ${c.section.length})`);
            });
        }
    } catch (err) {
        console.error('Debug error:', err.message);
    } finally {
        process.exit();
    }
}

debugStrings();
