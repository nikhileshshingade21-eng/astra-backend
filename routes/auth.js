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
        
        const mask = (val) => val ? `${val.substring(0, 4)}...${val.substring(val.length - 4)}` : 'MISSING';
        
        const envs = {
            DATABASE_URL: mask(process.env.DATABASE_URL),
            DB_HOST: mask(process.env.DB_HOST),
            DB_USER: mask(process.env.DB_USER),
            DB_NAME: mask(process.env.DB_NAME),
            NODE_ENV: process.env.NODE_ENV
        };

        const result = await queryAll('SELECT id, roll_number, name, programme, section, SUBSTRING(password_hash, 1, 10) as hash_start FROM users WHERE roll_number = $1', [roll.toUpperCase()]);
        
        res.json({ 
            status: 'connected',
            user_found: result.length > 0,
            user_data: result[0] || null,
            env_check: envs
        });
    } catch (err) {
        const mask = (val) => val ? `${val.substring(0, 4)}...${val.substring(val.length - 4)}` : 'MISSING';
        res.status(500).json({ 
            error: err.message,
            env_debug: {
                DATABASE_URL: mask(process.env.DATABASE_URL),
                DB_HOST: mask(process.env.DB_HOST),
                DB_USER: mask(process.env.DB_USER),
                DB_NAME: mask(process.env.DB_NAME)
            }
        });
    }
});

// --- DEBUG LOGIN (TEMPORARY) ---
router.post('/debug-login', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const jwt = require('jsonwebtoken');
        const { queryAll } = require('../database_module');
        const { JWT_SECRET } = require('../middleware');
        
        const { roll_number, password } = req.body;
        const result = await queryAll(
            'SELECT id, roll_number, name, programme, section, role, password_hash FROM users WHERE roll_number = $1',
            [roll_number.toUpperCase()]
        );
        
        if (result.length === 0) return res.status(401).json({ error: 'User not found' });
        
        const user = result[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid password' });
        
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
        
        // Skip notifications insert — just return success
        const { password_hash, ...safeUser } = user;
        res.json({ success: true, token, user: safeUser });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack?.split('\n')[1] });
    }
});

module.exports = router;

module.exports = router;
