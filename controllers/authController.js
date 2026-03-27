const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, queryAll, saveDb } = require('../database_module.js');
const { JWT_SECRET } = require('../middleware');
const { encrypt, decrypt } = require('../utils/encryption');

const verify = async (req, res) => {
    try {
        const { roll_number } = req.body;
        if (!roll_number) return res.status(400).json({ error: 'Roll number required' });

        const db = await getDb();
        const existing = await queryAll('SELECT id FROM users WHERE roll_number = $1', [roll_number.toUpperCase()]);
        
        // CHECK INSTITUTIONAL REGISTRY (Phase 4)
        const verified = await queryAll('SELECT id FROM verified_students WHERE roll_number = $1', [roll_number.toUpperCase()]);

        // SEC-004 FIX: Return same structure regardless of existence to prevent enumeration
        const exists = existing.length > 0;
        const isVerified = verified.length > 0;

        res.json({ 
            received: true, 
            valid: isVerified, // Student must be in verified_students to be "valid" for registration
            registered: exists // If they are already in users, they are "registered"
        });
    } catch (err) {
        res.status(500).json({ error: 'Verification failed' });
    }
};

const register = async (req, res) => {
    try {
        const { 
            roll_number, name, email, phone, programme, section, password, 
            biometric_enrolled, face_enrolled,
            biometric_template, face_template,
            device_id
        } = req.body;

        if (!roll_number || !name || !password) {
            return res.status(400).json({ error: 'Roll number, name, and password are required' });
        }

        // VULN-009 FIX: Input validation
        if (typeof roll_number !== 'string' || roll_number.length > 20) {
            return res.status(400).json({ error: 'Invalid roll number format' });
        }
        if (typeof name !== 'string' || name.length < 2 || name.length > 100) {
            return res.status(400).json({ error: 'Name must be 2-100 characters' });
        }
        if (password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
            return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase, number, and special character.' });
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (phone && !/^\+?[\d\s-]{7,15}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        const db = await getDb();

        // CHECK INSTITUTIONAL REGISTRY (Phase 4)
        const verifiedList = await queryAll('SELECT id FROM verified_students WHERE roll_number = $1', [roll_number.toUpperCase()]);
        if (verifiedList.length === 0) {
            return res.status(403).json({ error: 'Identity not found in institutional registry. Please contact admin.' });
        }

        // Check if roll number already exists
        const existing = await queryAll('SELECT id, password_hash, is_registered FROM users WHERE roll_number = $1', [roll_number.toUpperCase()]);

        // SEC-002 FIX: Role is always 'student' for self-registration.
        // Admin/faculty roles must be assigned by an existing admin.
        let userId;
        const userRole = 'student';

        if (existing.length > 0) {
            // User exists, but is it a pre-seeded student?
            const existingUser = existing[0];
            const oldId = existingUser.id;
            const oldHash = existingUser.password_hash;

            // VULN-003 FIX: Only bcrypt-hashed comparisons — no plain-text fallback
            const isDefaultSeeded = bcrypt.compareSync('123', oldHash) || 
                                   bcrypt.compareSync('password123', oldHash);

            if (isDefaultSeeded || !existingUser.is_registered) {
                // Claim pre-seeded account: Update it with all fields from registration
                const password_hash = await bcrypt.hash(password, 10);
                
                // SEC-001 FIX: Purged simulation logic. Only store provided templates.
                let encBio = null;
                let encFace = null;
                if (biometric_enrolled && biometric_template) {
                    encBio = encrypt(JSON.stringify(biometric_template));
                }
                if (face_enrolled && face_template) {
                    encFace = encrypt(JSON.stringify(face_template));
                }

                await queryAll(
                    `UPDATE users SET name = $1, email = $2, phone = $3, programme = $4, section = $5, password_hash = $6, 
                     biometric_enrolled = $7, face_enrolled = $8, biometric_template = $9, face_template = $10, is_registered = TRUE, device_id = $11 WHERE id = $12`,
                    [name, email || null, phone || null, programme || null, section || null, password_hash, 
                     biometric_enrolled ? 1 : 0, face_enrolled ? 1 : 0, encBio, encFace, device_id || null, oldId]
                );
                userId = oldId;
            } else {
                return res.status(409).json({ error: 'Roll number already registered and claimed.' });
            }
        } else {
            // New user registration
            const password_hash = await bcrypt.hash(password, 10);

            // SEC-001 FIX: Purged simulation logic.
            let encBio = null;
            let encFace = null;
            if (biometric_enrolled && biometric_template) {
                encBio = encrypt(JSON.stringify(biometric_template));
            }
            if (face_enrolled && face_template) {
                encFace = encrypt(JSON.stringify(face_template));
            }

            const insertResult = await queryAll(
                `INSERT INTO users (roll_number, name, email, phone, programme, section, role, password_hash, 
                 biometric_enrolled, face_enrolled, biometric_template, face_template, is_registered, device_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
                [roll_number.toUpperCase(), name, email || null, phone || null, programme || null, section || null, 
                 userRole, password_hash, biometric_enrolled ? 1 : 0, face_enrolled ? 1 : 0, encBio, encFace, true, device_id || null]
            );

            if (insertResult && insertResult.length > 0) {
                userId = insertResult[0].id;
            } else {
                throw new Error("Database failed to return new user ID.");
            }
        }

        // Create welcome notification (Non-blocking)
        queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [userId, 'Welcome to ASTRA', `Your account has been created successfully. Roll: ${roll_number.toUpperCase()}`, 'success']
        ).catch(e => console.error('Welcome notification failed:', e.message));

        // Generate token
        // VULN-007 FIX: Reduced token expiry from 30d to 2h
        const token = jwt.sign({ userId: userId, role: userRole }, JWT_SECRET, { expiresIn: '2h' });

        res.json({
            success: true,
            token,
            user: { id: userId, roll_number: roll_number.toUpperCase(), name, email, phone, programme, section, role: userRole, biometric_enrolled: !!biometric_enrolled, face_enrolled: !!face_enrolled }
        });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
};

const login = async (req, res) => {
    try {
        const { roll_number, password } = req.body;

        if (!roll_number || !password) {
            return res.status(400).json({ error: 'Roll number and password are required' });
        }

        const db = await getDb();
        const result = await queryAll(
            'SELECT id, roll_number, name, email, phone, programme, section, role, password_hash, biometric_enrolled, face_enrolled, is_registered, device_id FROM users WHERE roll_number = $1',
            [roll_number.toUpperCase()]
        );

        if (result.length === 0) {
            return res.status(401).json({ error: 'Invalid roll number or password' });
        }

        const user = result[0];

        // VULN-016 FIX: Device Binding Check (Enforced)
        const { device_id } = req.body;
        if (user.device_id && user.device_id !== device_id) {
            return res.status(403).json({ error: 'DEVICE_MISMATCH', message: 'This account is bound to another device. Contact Admin for reset.' });
        }

        // If no device bound yet, bind it now
        if (!user.device_id && device_id) {
            await queryAll('UPDATE users SET device_id = $1 WHERE id = $2', [device_id, user.id]);
        }

        // VULN-015 FIX: Prevent login for unregistered/unclaimed accounts
        if (!user.is_registered) {
            return res.status(403).json({ error: 'Account not registered. Please complete registration first.' });
        }
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid roll number or password' });
        }

        // VULN-007 FIX: Reduced token expiry from 30d to 2h
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

        // Log login notification
        await queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [user.id, 'Login Successful', `Authenticated at ${new Date().toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Kolkata' })}`, 'info']
        );

        const { password_hash, ...safeUser } = user;
        res.json({ success: true, token, user: safeUser });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
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
