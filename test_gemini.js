require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Try both possible key variations (0 vs O at the end)
const keys = [
    'AIzaSyB8ttJdzBMyNOSbZwWKAGYA2cuYTZLdN0k',  // with zero
    'AIzaSyB8ttJdzBMyNOSbZwWKAGYA2cuYTZLdNOk',  // with letter O
];

async function testKey(key) {
    console.log(`\nTesting key ending ...${key.slice(-5)}`);
    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Say hello in one word");
        console.log("✅ SUCCESS:", result.response.text().substring(0, 50));
        return true;
    } catch (e) {
        console.log("❌ FAILED:", e.message.substring(0, 100));
        return false;
    }
}

async function main() {
    for (const key of keys) {
        const ok = await testKey(key);
        if (ok) {
            console.log(`\n🎯 WORKING KEY: ${key}`);
            break;
        }
    }
    process.exit(0);
}
main();
