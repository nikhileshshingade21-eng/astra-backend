const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    try {
        console.log("Initializing Gemini with key...");
        const genAI = new GoogleGenerativeAI('AIzaSyB8ttJdzBMyNOSbZwWKAGYA2cuYTZLdNOk');
        
        console.log("Getting model...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        console.log("Generating content...");
        const result = await model.generateContent("Crack a joke on programming");
        
        console.log("Success! Response:");
        console.log(result.response.text());
    } catch (e) {
        console.error("Gemini Error:", e.message);
        console.error("Full Error Object:", JSON.stringify(e, null, 2));
    }
}

testGemini();
