const { getDb, saveDb, queryAll } = require('./db');

async function resetPass() {
    const db = await getDb();
    db.run("UPDATE users SET password_hash = '123', email = NULL, phone = NULL WHERE roll_number = '25N81A6258'");
    saveDb();
    const user = await queryAll("SELECT * FROM users WHERE roll_number = '25N81A6258'");
    console.log('User status after reset:', user);
}
resetPass();
