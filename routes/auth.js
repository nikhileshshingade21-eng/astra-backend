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

module.exports = router;
