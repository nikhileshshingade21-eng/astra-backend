const fs = require('fs');

async function injectCredentials() {
    console.log("Waiting 45 seconds for Railway deploy to finish...");
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    try {
        console.log("Reading local, perfectly formatted firebase-credentials.json...");
        const payload = JSON.parse(fs.readFileSync('firebase-credentials.json', 'utf8'));
        
        console.log(`Payload loaded. Project ID: ${payload.project_id}. Key length: ${payload.private_key.length}. Sending to production...`);
        
        const response = await fetch('https://astra-backend-production-a16d.up.railway.app/api/admin/fix-firebase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const text = await response.text();
        console.log("Response Status:", response.status);
        console.log("Response Body:", text);
    } catch (e) {
        console.error("Injection failed:", e.message);
    }
}

injectCredentials();
