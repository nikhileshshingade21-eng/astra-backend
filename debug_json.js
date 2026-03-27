require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function debugJson() {
    try {
        const user = await queryAll("SELECT programme, section FROM users WHERE roll_number = '25N81A6243'");
        if (user.length > 0) {
            console.log('User Programme JSON:', JSON.stringify(user[0].programme));
            console.log('User Section JSON:', JSON.stringify(user[0].section));
            
            const classes = await queryAll("SELECT DISTINCT programme, section FROM classes");
            console.log('\nClasses in DB JSON:');
            classes.forEach(c => {
                console.log(`- Programme: ${JSON.stringify(c.programme)}, Section: ${JSON.stringify(c.section)}`);
            });
        }
    } catch (err) {
        console.error('Debug error:', err.message);
    } finally {
        process.exit();
    }
}

debugJson();
