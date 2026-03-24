const crypto = require('crypto');

let rawKey = (process.env.ENCRYPTION_KEY || "").replace(/['"\s]+/g, "");
if (rawKey.length === 0) {
    console.error('FATAL: ENCRYPTION_KEY environment variable is not set.');
    process.exit(1);
}
if (rawKey.length < 64) {
    rawKey = rawKey.padEnd(64, '0');
} else if (rawKey.length > 64) {
    rawKey = rawKey.substring(0, 64);
}
const ENCRYPTION_KEY = rawKey;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts plaintext string using AES-256-GCM
 * Returns IV:AuthTag:Ciphertext format (hex)
 */
function encrypt(plaintext) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts string in IV:AuthTag:Ciphertext format
 */
function decrypt(encryptedStr) {
    const [ivHex, authTagHex, ciphertextHex] = encryptedStr.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * Encrypts a Buffer (for files)
 */
function encryptBuffer(buffer) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Format: IV(16) + AuthTag(16) + Content
    return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypts an encrypted Buffer
 */
function decryptBuffer(encBuffer) {
    const iv = encBuffer.slice(0, IV_LENGTH);
    const authTag = encBuffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = encBuffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

module.exports = {
    encrypt,
    decrypt,
    encryptBuffer,
    decryptBuffer
};
