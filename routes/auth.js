const express = require('express');
const { authMiddleware } = require('../middleware');
const { verify, register, login, getMe } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/verify — Verify identity for biometric enrollment
router.post('/verify', verify);

// POST /api/auth/register — Create a new account
router.post('/register', register);

// POST /api/auth/login — Login with credentials
router.post('/login', login);

// GET /api/auth/me — Get current user profile
router.get('/me', authMiddleware, getMe);

module.exports = router;
