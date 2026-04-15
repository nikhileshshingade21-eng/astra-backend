require('dotenv').config();
const { sendMorningDigest } = require('./services/smartNotifyService');

(async () => {
    try {
        console.log("Manually triggering Morning Digest...");
        await sendMorningDigest();
        console.log("Finished executing Morning Digest.");
        process.exit(0);
    } catch (e) {
        console.error("Diagnostics error:", e);
        process.exit(1);
    }
})();
