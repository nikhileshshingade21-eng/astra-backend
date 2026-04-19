require('dotenv').config();
const { queryAll } = require('./database_module');

async function perfectAlign() {
    console.log('🚀 [PERFECT ALIGN] Starting Data Correction...');
    try {
        // 1. REVERT USERS (S1 -> CS)
        const userRevert = await queryAll(
            "UPDATE users SET section = 'CS' WHERE programme = 'B.Tech CSC' AND section = 'S1'"
        );
        console.log(`✅ [USERS] Reverted 5 users back to section 'CS'.`);

        // 2. RENAME CLASSES PROGRAMME (B.Tech CS -> B.Tech CSC)
        const classAlign = await queryAll(
            "UPDATE classes SET programme = 'B.Tech CSC' WHERE programme = 'B.Tech CS' AND section = 'CS'"
        );
        console.log(`✅ [CLASSES] Aligned ${classAlign.length} classes to 'B.Tech CSC' branch.`);

        // 3. DELETE REDUNDANT S1 CLASSES
        const s1Delete = await queryAll(
            "DELETE FROM classes WHERE programme = 'B.Tech CSC' AND section = 'S1'"
        );
        console.log(`✅ [CLEANUP] Deleted ${s1Delete.length} redundant 'S1' classes.`);

        // 4. VERIFICATION
        const finalCheck = await queryAll(
            "SELECT COUNT(*) as count FROM classes WHERE programme = 'B.Tech CSC' AND section = 'CS'"
        );
        console.log(`📊 [VERIFY] Total classes now available for B.Tech CSC / CS: ${finalCheck[0].count}`);

    } catch (err) {
        console.error('❌ [FATAL] Correction failed:', err.message);
        process.exit(1);
    }
}

perfectAlign();
