require('dotenv').config();
const { queryAll } = require('./database_module');

async function alignSections() {
    console.log('🚀 [ALIGNMENT] Starting Section Harmonization...');
    try {
        // 1. Check affected users
        const before = await queryAll(
            "SELECT id, name, roll_number FROM users WHERE programme = 'B.Tech CSC' AND section = 'CS'"
        );
        console.log(`🔍 [ALIGNMENT] Found ${before.length} users with section 'CS' in B.Tech CSC.`);

        if (before.length === 0) {
            console.log('✅ [ALIGNMENT] No users need alignment. Everything is consistent.');
            return;
        }

        // 2. Perform Update
        const result = await queryAll(
            "UPDATE users SET section = 'S1' WHERE programme = 'B.Tech CSC' AND section = 'CS'"
        );
        console.log(`✅ [ALIGNMENT] Successfully moved ${before.length} users to section 'S1'.`);

        // 3. Verification
        const verified = await queryAll(
            "SELECT COUNT(*) as count FROM users WHERE programme = 'B.Tech CSC' AND section = 'S1'"
        );
        console.log(`📊 [ALIGNMENT] Total B.Tech CSC students now in section S1: ${verified[0].count}`);

    } catch (err) {
        console.error('❌ [ALIGNMENT] Fatal error during migration:', err.message);
        process.exit(1);
    }
}

alignSections();
