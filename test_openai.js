require('dotenv').config();
const { chat } = require('./services/aiService');

async function runTest() {
    console.log("🚀 Testing ASTRA AI (OpenAI Implementation)...");
    
    const studentId = '25N81A6258'; // The user's student ID
    const message = "Tell me a short joke about programming."; // Not an academic question!
    
    console.log(`\nUser (${studentId}): "${message}"\n`);
    
    try {
        const result = await chat(studentId, message);
        console.log("ASTRA AI Response:");
        console.log("--------------------------------------------------");
        console.log(result.response);
        console.log("--------------------------------------------------");
        console.log(`Source: ${result.source}`);
        console.log(`Topic: ${result.metadata.topic}`);
    } catch (err) {
        console.error("Test Failed!", err);
    }
    
    process.exit(0);
}

runTest();
