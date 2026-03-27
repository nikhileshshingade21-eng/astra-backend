const { queryAll } = require('./database_module');

async function resetPass() {
    await queryAll("UPDATE users SET password_hash = $1, email = NULL, phone = NULL WHERE roll_number = '25N81A6258'", ['123']);
    const user = await queryAll("SELECT * FROM users WHERE roll_number = '25N81A6258'");
    console.log('User status after reset:', user);
}
resetPass();
