const jwt = require('jsonwebtoken');
const { getDb, queryAll } = require('./database_module.js');
const { getOrSetCache } = require('./services/cacheService');
const { isUserBanned } = require('./services/threatService');

// VULN-001 FIX: JWT secret loaded from environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set.');
    process.exit(1);
}

// Middleware to verify JWT token
async function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const token = header.split(' ')[1];
        // Enforce strong algorithm
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        
        // Optimize: Cache user identity and ban status for 60s to reduce DB load
        const cacheKey = `user_session_${decoded.userId}`;
        const sessionData = await getOrSetCache(cacheKey, 60, async () => {
            const db = await getDb();
            const userResult = await queryAll('SELECT id, roll_number, name, email, phone, programme, section, role FROM users WHERE id = ?', [decoded.userId]);
            
            if (!userResult.length || !userResult[0].values.length) {
                return null;
            }
            const row = userResult[0].values[0];
            const user = {
                id: row[0], roll_number: row[1], name: row[2], email: row[3],
                phone: row[4], programme: row[5], section: row[6], role: row[7]
            };
            
            const ban = await isUserBanned(user.id);
            return { user, ban };
        });

        if (!sessionData || !sessionData.user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = sessionData.user;

        // 🛡️ THREAT CHECK: Block banned users at the gate
        if (sessionData.ban) {
            return res.status(403).json({
                error: '⛔ ACCOUNT SUSPENDED',
                reason: sessionData.ban.reason,
                banned_at: sessionData.ban.banned_at,
                expires_at: sessionData.ban.is_permanent ? 'Permanent — contact admin' : sessionData.ban.expires_at
            });
        }

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Admin-only middleware
function adminMiddleware(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Faculty/Admin-only middleware
function facultyMiddleware(req, res, next) {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Faculty access required' });
    }
    next();
}

module.exports = { JWT_SECRET, authMiddleware, adminMiddleware, facultyMiddleware };
