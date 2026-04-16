const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

/**
 * ASTRA Hardened Firebase Service v2.0
 * =====================================
 * Handles ALL Railway/Production initialization edge cases:
 * 1. Local credentials file (dev)
 * 2. Environment variable as JSON string
 * 3. Environment variable as file path (Railway duplicate var override)
 * 4. Hardcoded fallback from known valid credentials
 */

let isInitialized = false;

function cleanPEM(key) {
    if (!key || typeof key !== 'string') return key;

    // 1. Convert literal \\n to actual newlines
    let cleaned = key.replace(/\\n/g, '\n');

    // 2. Remove all backslashes (Railway env-to-json mangling)
    cleaned = cleaned.replace(/\\/g, '');

    const header = "-----BEGIN PRIVATE KEY-----";
    const footer = "-----END PRIVATE KEY-----";

    if (cleaned.includes(header) && cleaned.includes(footer)) {
        const body = cleaned.substring(
            cleaned.indexOf(header) + header.length,
            cleaned.indexOf(footer)
        );
        
        // 3. Strip EVERYTHING that isn't a valid base64 character
        const cleanBody = body.replace(/[^A-Za-z0-9+/=]/g, '');
        
        // 4. Reconstruct with standard 64-character line breaks
        const lines = cleanBody.match(/.{1,64}/g) || [];
        return `${header}\n${lines.join('\n')}\n${footer}`;
    }

    return cleaned.trim();
}


function initialize() {
    if (admin.apps.length > 0) {
        isInitialized = true;
        return admin;
    }

    let serviceAccount = null;

    // ─── STRATEGY 0: Base64 Encoded Env Var (Most Reliable) ───────────────
    if (process.env.FIREBASE_BASE64) {
        try {
            const decoded = Buffer.from(process.env.FIREBASE_BASE64.trim(), 'base64').toString('utf8');
            serviceAccount = JSON.parse(decoded);
            console.log('[FIREBASE] Strategy 0: Loaded from FIREBASE_BASE64 env var');
        } catch (e) {
            console.error('[FIREBASE] Strategy 0 failed:', e.message);
        }
    }

    // ─── STRATEGY 1: Local credentials file (dev mode) ──────────────────
    const credPath = path.join(__dirname, '..', 'firebase-credentials.json');
    if (!serviceAccount && fs.existsSync(credPath)) {
        try {
            serviceAccount = require(credPath);
            console.log('[FIREBASE] Strategy 1: Loaded credentials from disk');
        } catch (e) {
            console.error('[FIREBASE] Strategy 1 failed:', e.message);
        }
    }

    // ─── STRATEGY 2: Environment variable as JSON string ────────────────
    if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const envVal = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.trim();
        
        // Only try JSON.parse if the value looks like JSON (starts with {)
        if (envVal.startsWith('{')) {
            try {
                serviceAccount = JSON.parse(envVal);
                console.log('[FIREBASE] Strategy 2: Parsed credentials from env JSON');
            } catch (e) {
                console.error('[FIREBASE] Strategy 2 failed (bad JSON):', e.message);
            }
        } else {
            // The env var was overwritten with a filename (Railway duplicate var bug)
            console.warn(`[FIREBASE] Strategy 2 skipped: env var is "${envVal}" (not JSON)`);
            
            // Try to use it as a file path
            const envFilePath = path.resolve(__dirname, '..', envVal);
            if (fs.existsSync(envFilePath)) {
                try {
                    serviceAccount = JSON.parse(fs.readFileSync(envFilePath, 'utf8'));
                    console.log(`[FIREBASE] Strategy 2b: Loaded from env-specified path: ${envVal}`);
                } catch (e) {
                    console.error('[FIREBASE] Strategy 2b failed:', e.message);
                }
            }
        }
    }

    // ─── STRATEGY 3: GOOGLE_APPLICATION_CREDENTIALS (standard GCP var) ──
    if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const gcpPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (fs.existsSync(gcpPath)) {
            try {
                serviceAccount = JSON.parse(fs.readFileSync(gcpPath, 'utf8'));
                console.log('[FIREBASE] Strategy 3: Loaded from GOOGLE_APPLICATION_CREDENTIALS path');
            } catch (e) {
                console.error('[FIREBASE] Strategy 3 failed:', e.message);
            }
        }
    }

    // ─── STRATEGY 4: Railway Volume persistence (/data) ─────────────────
    if (!serviceAccount) {
        const volumePath = '/data/firebase-credentials.json';
        if (fs.existsSync(volumePath)) {
            try {
                serviceAccount = JSON.parse(fs.readFileSync(volumePath, 'utf8'));
                console.log('[FIREBASE] Strategy 4: Loaded from Railway volume /data');
            } catch (e) {
                console.error('[FIREBASE] Strategy 4 failed:', e.message);
            }
        }
    }

    if (!serviceAccount) {
        console.error('[FIREBASE] ════════════════════════════════════════');
        console.error('[FIREBASE] ALL STRATEGIES FAILED. Firebase is OFFLINE.');
        console.error('[FIREBASE] Push notifications are permanently disabled.');
        console.error('[FIREBASE] Fix: Set GOOGLE_APPLICATION_CREDENTIALS_JSON env var as valid JSON');
        console.error('[FIREBASE] ════════════════════════════════════════');
        return admin;
    }

    // Harden Private Key
    if (serviceAccount.private_key) {
        serviceAccount.private_key = cleanPEM(serviceAccount.private_key);
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        isInitialized = true;
        console.log('[FIREBASE] ✅ Firebase Admin SDK initialized successfully');
    } catch (err) {
        console.error('[CRITICAL] Firebase Initialization Failed:', err.message);
        console.error('[HINT] Check that your private key starts with -----BEGIN PRIVATE KEY-----');
    }

    return admin;
}

module.exports = initialize();

