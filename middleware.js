const jwt = require('jsonwebtoken');
const { getDb, queryAll } = require('./db');

const JWT_SECRET = 'astra-secure-key-2026-synthwave';

// Middleware to verify JWT token
async function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const db = await getDb();
        const user = queryAll('SELECT id, roll_number, name, email, phone, programme, section, role FROM users WHERE id = ?', [decoded.userId]);
        if (!user.length || !user[0].values.length) {
            return res.status(401).json({ error: 'User not found' });
        }
        const row = user[0].values[0];
        req.user = {
            id: row[0], roll_number: row[1], name: row[2], email: row[3],
            phone: row[4], programme: row[5], section: row[6], role: row[7]
        };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = { JWT_SECRET, authMiddleware };
