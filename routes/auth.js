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

// --- EMERGENCY SEED ENDPOINT (TEMPORARY) ---
router.post('/emergency-seed', async (req, res) => {
    try {
        const { queryAll } = require('../database_module');
        const { getCacheClient } = require('../services/cacheService');
        
        // 1. Ensure user is verified
        await queryAll("INSERT INTO verified_students (roll_number) VALUES ($1) ON CONFLICT DO NOTHING", ['25N81A6258']);
        
        // 2. Ensure user exists with correct profile
        await queryAll("UPDATE users SET programme = 'B.Tech CSC', section = 'CS' WHERE name LIKE '%Nikhilesh%'");

        // 3. Seed Tuesday Classes with CORRECT COLUMNS
        const day = 'Tuesday';
        await queryAll("DELETE FROM classes WHERE day = $1 AND section = 'CS'", [day]);
        
        const classes = [
            ['CS101', 'Data Structures', 'Dr. Sharma', 'L-101', '09:30 AM', '10:30 AM'],
            ['CS102', 'Python Lab', 'Prof. Rao', 'Lab-2', '10:30 AM', '12:30 PM'],
            ['CS103', 'Mathematics III', 'Dr. Reddy', 'L-102', '01:30 PM', '02:30 PM'],
            ['CS104', 'OS Principles', 'Dr. Verma', 'L-103', '02:30 PM', '03:30 PM'],
            ['CS105', 'Digital Electronics', 'Prof. Kumar', 'L-104', '03:30 PM', '04:30 PM']
        ];

        for (const c of classes) {
            await queryAll(`
                INSERT INTO classes (code, name, faculty_name, room, start_time, end_time, day, programme, section)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [...c, day, 'B.Tech CSC', 'CS']);
        }

        // 4. CLEAR CACHE for the user's timetable
        const redis = await getCacheClient();
        if (redis && typeof redis.del === 'function') {
            await redis.del(`timetable:${day}:B.Tech CSC:CS`);
            console.log('[DB] Cleared timetable cache for CS');
        }

        res.json({ success: true, message: `Seeded ${day} classes and cleared cache` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
