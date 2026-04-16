const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

/**
 * ASTRA Hardened Firebase Service
 * Handles robust initialization for Railway/Production environments.
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
        // We must be very careful: A-Z, a-z, 0-9, +, /, =
        const cleanBody = body.replace(/[^A-Za-z0-9+/=]/g, '');
        
        // 4. Reconstruct with standard 64-character line breaks
        // Most modern parsers accept one line, but some ASN.1 parsers prefer the 64-char limit.
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
    const credPath = path.join(__dirname, '..', 'firebase-credentials.json');

    // Load Strategy 1: Local File
    if (fs.existsSync(credPath)) {
        try {
            serviceAccount = require(credPath);
            console.log('[FIREBASE] Loading credentials from disk');
        } catch (e) {
            console.error('[FIREBASE] Failed to load credentials file:', e.message);
        }
    } 
    
    // Load Strategy 2: Environment Variable
    if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
            serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
            console.log('[FIREBASE] Loading credentials from environment variable');
        } catch (e) {
            console.error('[FIREBASE] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e.message);
        }
    }

    if (!serviceAccount) {
        console.warn('[FIREBASE] No service account found. Push notifications will be disabled.');
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
        console.log('[FIREBASE] Firebase Admin SDK initialized successfully');
    } catch (err) {
        console.error('[CRITICAL] Firebase Initialization Failed:', err.message);
        console.error('[HINT] Check that your private key starts with -----BEGIN PRIVATE KEY-----');
        // Do NOT re-throw. Allow the app to stay alive in "Notification Offline" mode.
    }

    return admin;
}

module.exports = initialize();
