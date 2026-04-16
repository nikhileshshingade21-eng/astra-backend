require('dotenv').config();
const { sendFeedbackEmail } = require('./services/emailService');

async function testEmail() {
    console.log("📨 Attempting to send test feedback email via Nodemailer...");
    try {
        const result = await sendFeedbackEmail(
            999, 
            'TEST_ROLL_01', 
            'bug', 
            'This is a test feedback message to verify the new Gmail/Nodemailer system is WORKING! 🚀'
        );
        
        if (result.success) {
            console.log("✅ Email sent successfully!");
            console.dir(result.data);
        } else {
            console.error("❌ Email failed:", result.error);
        }
    } catch (e) {
        console.error("❌ Critical error in test script:", e.message);
    }
    process.exit(0);
}

testEmail();
