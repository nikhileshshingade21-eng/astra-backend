const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDb, queryAll } = require('../db');
const { JWT_SECRET } = require('../middleware');
const { encrypt, decrypt } = require('../utils/encryption');

const verify = async (req, res) => {
    try {
        const { roll_number } = req.body;
        if (!roll_number) return res.status(400).json({ error: 'Roll number required' });

        const db = await getDb();
        const existing = queryAll('SELECT id FROM users WHERE roll_number = ?', [roll_number.toUpperCase()]);

        if (existing.length && existing[0].values.length) {
            res.json({ valid: true });
        } else {
            res.json({ valid: false });
        }
    } catch (err) {
        res.status(500).json({ error: 'Verification failed' });
    }
};

const register = async (req, res) => {
    try {
        const { 
            roll_number, name, email, phone, programme, section, role, password, 
            biometric_enrolled, face_enrolled,
            biometric_template, face_template 
        } = req.body;

        if (!roll_number || !name || !password) {
            return res.status(400).json({ error: 'Roll number, name, and password are required' });
        }

        const db = await getDb();

        // Check if roll number already exists
        const existing = queryAll('SELECT id, password_hash FROM users WHERE roll_number = ?', [roll_number.toUpperCase()]);

        let userId;
        const userRole = role || 'student';

        if (existing.length && existing[0].values.length) {
            // User exists, but is it a pre-seeded student?
            const existingUser = existing[0].values[0];
            const oldId = existingUser[0];
            const oldHash = existingUser[1];

            // Check if it's a default seeded password ("123" or "password123")
            const isDefaultSeeded = bcrypt.compareSync('123', oldHash) || 
                                   bcrypt.compareSync('password123', oldHash) || 
                                   oldHash === '123' || 
                                   oldHash === 'password123';

            if (isDefaultSeeded) {
                // Claim pre-seeded account: Update it with all fields from registration
                const password_hash = await bcrypt.hash(password, 10);
                
                // Encryption of Sensitive Data
                let encBio = null;
                let encFace = null;
                if (biometric_enrolled) {
                    const bioData = biometric_template ? JSON.stringify(biometric_template) : JSON.stringify({ type: 'fp_template', data: Array.from({length: 64}, () => Math.random()) });
                    encBio = encrypt(bioData);
                }
                if (face_enrolled) {
                    const faceData = face_template ? JSON.stringify(face_template) : JSON.stringify({ type: 'face_geom', data: Array.from({length: 128}, () => Math.random()) });
                    encFace = encrypt(faceData);
                }

                db.run(
                    `UPDATE users SET name = ?, email = ?, phone = ?, programme = ?, section = ?, password_hash = ?, 
                     biometric_enrolled = ?, face_enrolled = ?, biometric_template = ?, face_template = ? WHERE id = ?`,
                    [name, email || null, phone || null, programme || null, section || null, password_hash, 
                     biometric_enrolled ? 1 : 0, face_enrolled ? 1 : 0, encBio, encFace, oldId]
                );
                userId = oldId;
            } else {
                return res.status(409).json({ error: 'Roll number already registered and claimed.' });
            }
        } else {
            // New user registration
            const password_hash = await bcrypt.hash(password, 10);

            // Encryption of Sensitive Data
            let encBio = null;
            let encFace = null;
            if (biometric_enrolled) {
                const bioData = biometric_template ? JSON.stringify(biometric_template) : JSON.stringify({ type: 'fp_template', data: Array.from({length: 64}, () => Math.random()) });
                encBio = encrypt(bioData);
            }
            if (face_enrolled) {
                const faceData = face_template ? JSON.stringify(face_template) : JSON.stringify({ type: 'face_geom', data: Array.from({length: 128}, () => Math.random()) });
                encFace = encrypt(faceData);
            }

            db.run(
                `INSERT INTO users (roll_number, name, email, phone, programme, section, role, password_hash, 
                 biometric_enrolled, face_enrolled, biometric_template, face_template) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [roll_number.toUpperCase(), name, email || null, phone || null, programme || null, section || null, 
                 userRole, password_hash, biometric_enrolled ? 1 : 0, face_enrolled ? 1 : 0, encBio, encFace]
            );

            const result = queryAll('SELECT last_insert_rowid()');
            userId = result[0].values[0][0];
        }

        saveDb();

        // Create welcome notification
        db.run(
            `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
            [userId, 'Welcome to ASTRA', `Your account has been created successfully. Roll: ${roll_number.toUpperCase()}`, 'success']
        );
        saveDb();

        // Generate token
        const token = jwt.sign({ userId: userId, role: userRole }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            token,
            user: { id: userId, roll_number: roll_number.toUpperCase(), name, email, phone, programme, section, role: userRole, biometric_enrolled: !!biometric_enrolled, face_enrolled: !!face_enrolled }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

const login = async (req, res) => {
    try {
        const { roll_number, password } = req.body;

        if (!roll_number || !password) {
            return res.status(400).json({ error: 'Roll number and password are required' });
        }

        const db = await getDb();
        const result = queryAll(
            'SELECT id, roll_number, name, email, phone, programme, section, role, password_hash, biometric_enrolled, face_enrolled FROM users WHERE roll_number = ?',
            [roll_number.toUpperCase()]
        );

        if (!result.length || !result[0].values.length) {
            return res.status(401).json({ error: 'Invalid roll number or password' });
        }

        const row = result[0].values[0];
        const user = {
            id: row[0], roll_number: row[1], name: row[2], email: row[3],
            phone: row[4], programme: row[5], section: row[6], role: row[7],
            biometric_enrolled: !!row[9], face_enrolled: !!row[10]
        };
        const password_hash = row[8];

        const valid = await bcrypt.compare(password, password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid roll number or password' });
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

        // Log login notification
        db.run(
            `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
            [user.id, 'Login Successful', `Authenticated at ${new Date().toLocaleTimeString()}`, 'info']
        );
        saveDb();

        res.json({ success: true, token, user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

const getMe = (req, res) => {
    res.json({ user: req.user });
};

module.exports = {
    verify,
    register,
    login,
    getMe
};
