const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware');
const { verify, register, login, getMe } = require('../controllers/authController');

const router = express.Router();

// VULN-006 FIX: Rate limiting on auth endpoints
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many registration attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// SEC-004 FIX: Rate limit on verify to prevent enumeration
const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { error: 'Too many verification attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// POST /api/auth/verify — Verify identity for biometric enrollment
router.post('/verify', verifyLimiter, verify);

// POST /api/auth/register — Create a new account
router.post('/register', registerLimiter, register);

// POST /api/auth/login — Login with credentials
router.post('/login', loginLimiter, login);

// GET /api/auth/me — Get current user profile
router.get('/me', authMiddleware, getMe);

// --- DIAGNOSTIC ENDPOINT (TEMPORARY) ---
router.get('/diag-user', async (req, res) => {
    try {
        const { queryAll } = require('../database_module');
        const roll = req.query.roll || '25N81A6258';
        const result = await queryAll('SELECT id, roll_number, name, programme, section, SUBSTRING(password_hash, 1, 10) as hash_start FROM users WHERE roll_number = $1', [roll.toUpperCase()]);
        
        const hostInfo = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1]?.split(':')[0] : 'No DATABASE_URL';
        
        res.json({ 
            connected_to: hostInfo,
            user_found: result.length > 0,
            user_data: result[0] || null,
            env_check: {
                has_jwt: !!process.env.JWT_SECRET,
                has_enc: !!process.env.ENCRYPTION_KEY,
                node_env: process.env.NODE_ENV
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

module.exports = router;
