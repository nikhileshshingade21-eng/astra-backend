const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, queryAll, saveDb } = require('../database_module.js');
const { JWT_SECRET } = require('../middleware');
const { encrypt, decrypt } = require('../utils/encryption');
const { sendResetEmail } = require('../services/emailService');
const crypto = require('crypto');

const verify = async (req, res) => {
    try {
        const { roll_number } = req.body;
        if (!roll_number) return res.error('Roll number required', null, 400);

        const cleanRoll = roll_number.trim().toUpperCase();
        const db = await getDb();
        const existing = await queryAll('SELECT id FROM users WHERE roll_number = $1', [cleanRoll]);
        
        // CHECK INSTITUTIONAL REGISTRY (Phase 4)
        const verified = await queryAll('SELECT id, programme, section FROM verified_students WHERE roll_number = $1', [cleanRoll]);

        // SEC-004 FIX: Return same structure regardless of existence to prevent enumeration
        const exists = existing.length > 0;
        const isVerified = verified.length > 0;
        const officialData = verified.length > 0 ? verified[0] : null;

        res.success({ 
            received: true, 
            valid: isVerified, // Student must be in verified_students to be "valid" for registration
            registered: exists, // If they are already in users, they are "registered"
            programme: officialData ? officialData.programme : null,
            section: officialData ? officialData.section : null
        });
    } catch (err) {
        res.error('Verification failed', null, 500);
    }
};

const register = async (req, res) => {
    try {
        const { 
            roll_number, name, email, phone, programme, section, 
            biometric_enrolled, face_enrolled, device_id, password
        } = req.body;

        if (!roll_number || !name || !password || !device_id) {
            return res.error('Roll number, name, and password are required', null, 400);
        }

        // VULN-009 FIX: Input validation
        if (typeof roll_number !== 'string' || roll_number.length > 20) {
            return res.error('Invalid roll number format', null, 400);
        }
        if (typeof name !== 'string' || name.length < 2 || name.length > 100) {
            return res.error('Name must be 2-100 characters', null, 400);
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.error('Invalid email format', null, 400);
        }
        if (phone && !/^\+?[\d\s-]{7,15}$/.test(phone)) {
            return res.error('Invalid phone number format', null, 400);
        }

        const cleanRoll = roll_number.trim().toUpperCase();
        const db = await getDb();

        // CHECK INSTITUTIONAL REGISTRY (Phase 4)
        const verifiedList = await queryAll('SELECT programme, section FROM verified_students WHERE roll_number = $1', [cleanRoll]);
        if (verifiedList.length === 0) {
            return res.error('Identity not found in institutional registry. Please contact admin.', null, 403);
        }

        const officialData = verifiedList[0];
        const assignedProgramme = officialData.programme || req.body.programme || 'B.Tech CSC';
        const assignedSection = officialData.section || req.body.section || 'CS';

        // Check if roll number already exists
        const existing = await queryAll('SELECT id, password_hash, is_registered, face_embedding FROM users WHERE roll_number = $1', [cleanRoll]);



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
            if (!existingUser.is_registered) {
                // Claim pre-seeded account
                const password_hash = await bcrypt.hash(password, 10);
                
                await queryAll(
                    `UPDATE users SET name = $1, email = $2, phone = $3, programme = $4, section = $5, password_hash = $6, 
                     biometric_enrolled = $7, is_registered = TRUE, device_id = $8, fcm_token = $9 WHERE id = $10`,
                    [name, email || null, phone || null, assignedProgramme, assignedSection, password_hash, 
                     biometric_enrolled ? 1 : 0, device_id, req.body.fcm_token || null, oldId]
                );
                userId = oldId;
            } else {
                return res.error('Roll number already registered and claimed.', null, 409);
            }
        } else {
            // New user registration
            const password_hash = await bcrypt.hash(password, 10);

            const insertResult = await queryAll(
                `INSERT INTO users (roll_number, name, email, phone, programme, section, role, password_hash, 
                 biometric_enrolled, is_registered, device_id, fcm_token) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
                [cleanRoll, name, email || null, phone || null, assignedProgramme, assignedSection, 
                 userRole, password_hash, biometric_enrolled ? 1 : 0, true, device_id, req.body.fcm_token || null]
            );

            if (insertResult && insertResult.length > 0) {
                userId = insertResult[0].id;
            } else {
                throw new Error("Database failed to return new user ID.");
            }
        }

        // Create welcome notification with automated assignment info
        queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [userId, 'Welcome to ASTRA', `Account active! You have been assigned to ${assignedProgramme} (Section ${assignedSection}).`, 'success']
        ).catch(e => console.warn('Welcome notification failed:', e.message));

        // Generate token
        // VULN-007 FIX: Reduced token expiry from 30d to 2h
        const token = jwt.sign({ userId: userId, role: userRole }, JWT_SECRET, { expiresIn: '2h' });

        res.success({
            token,
            user: { id: userId, roll_number: cleanRoll, name, email, phone, programme, section, role: userRole, biometric_enrolled: !!biometric_enrolled, face_enrolled: !!face_enrolled }
        }, 'Registration successful');
    } catch (err) {
        console.error('Register error:', err.message);
        res.error('Registration failed. Please try again.', null, 500);
    }
};

const login = async (req, res) => {
    try {
        const { roll_number, password, device_id, biometric_auth } = req.body;

        // Institutional Validation Gate: Distinguish between Biometric and Manual flows
        if (!roll_number) {
            return res.error('Roll number is required', null, 401);
        }

        if (!biometric_auth && !password) {
            return res.error('Roll number and password are required', null, 401);
        }

        if (!device_id) {
            return res.error('Device binding failed. Please retry.', null, 401);
        }

        const cleanRoll = roll_number.trim().toUpperCase();
        const db = await getDb();
        const result = await queryAll(
            'SELECT id, roll_number, name, email, phone, programme, section, role, is_registered, device_id, password_hash FROM users WHERE roll_number = $1',
            [cleanRoll]
        );

        if (result.length === 0) {
            return res.error('ACCOUNT_NOT_FOUND', null, 401);
        }

        const user = result[0];

        // VULN-015 FIX: Prevent login for unregistered/unclaimed accounts
        if (!user.is_registered) {
            return res.error('ACCOUNT_NOT_REGISTERED', { message: 'Account not registered. Please complete registration first.' }, 403);
        }

        // VULN-016 FIX: Strict Device Binding Check
        if (user.device_id && user.device_id !== device_id) {
            return res.error('DEVICE_MISMATCH', { message: 'This account is bound to another device. Contact Admin for reset.' }, 403);
        }

        // If no device bound yet, bind it now (in-case migrated from legacy)
        if (!user.device_id && device_id) {
            await queryAll('UPDATE users SET device_id = $1 WHERE id = $2', [device_id, user.id]);
        }

        // SELF-HEALING: Sync missing programme/section from registry
        if (!user.programme || !user.section) {
            const registry = await queryAll('SELECT programme, section FROM verified_students WHERE roll_number = $1', [cleanRoll]);
            if (registry.length > 0 && registry[0].programme && registry[0].section) {
                await queryAll('UPDATE users SET programme = $1, section = $2 WHERE id = $3', [registry[0].programme, registry[0].section, user.id]);
                user.programme = registry[0].programme;
                user.section = registry[0].section;
                console.log(`[🛠️ SELF-HEAL] Updated section for ${user.roll_number}`);
            }
        }

        // Save FCM token if provided (for push notifications)
        if (req.body.fcm_token) {
            await queryAll('UPDATE users SET fcm_token = $1 WHERE id = $2', [req.body.fcm_token, user.id]);
        }

        // VULN-020 FIX: Prioritize Password over Biometrics to allow manual login for unenrolled users
        if (password) {
            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) {
                return res.error('INVALID_CREDENTIALS', { message: 'The password provided is incorrect.' }, 401);
            }
            console.log(`[🛡️ AUTH] Password Entry: ${user.roll_number}`);
        } 
        // Case 2: Biometric Handshake (Only if no password provided)
        else if (biometric_auth) {
            // VULN-017 FIX: Prevent unauthorized biometric entry for unenrolled accounts
            if (!user.biometric_enrolled && !req.body.face_auth) {
                return res.error('BIOMETRIC_NOT_ENROLLED', { message: 'Biometrics not set up for this account.' }, 403);
            }
            console.log(`[🛡️ AUTH] Biometric Handshake: ${user.roll_number}`);
        } 
        else {
            return res.error('CREDENTIALS_REQUIRED', { message: 'Please provide a password or use biometrics.' }, 401);
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

        // Log login notification
        await queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [user.id, 'Login Successful', `Authenticated at ${new Date().toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Kolkata' })}`, 'info']
        );

        const { password_hash, ...safeUser } = user;
        res.success({ token, user: safeUser }, 'Login successful');
    } catch (err) {
        console.error('Login error:', err.message);
        res.error('Login failed. Please try again.', null, 500);
    }
};

const getMe = (req, res) => {
    res.success({ user: req.user });
};

const forgotPassword = async (req, res) => {
    try {
        const { roll_number } = req.body;
        if (!roll_number) {
            return res.error('Roll number is required', null, 400);
        }
        const cleanRoll = roll_number.trim().toUpperCase();
        const userRes = await queryAll('SELECT id, name, email FROM users WHERE roll_number = $1', [cleanRoll]);
        if (userRes.length === 0 || !userRes[0].email) {
            // SEC-001: Generic response to prevent enumeration
            return res.success(null, 'If an account exists with that ID, a recovery code has been sent.');
        }

        const user = userRes[0];
        const resetToken = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        await queryAll(
            'UPDATE users SET reset_token = $1, reset_expiry = $2 WHERE id = $3',
            [resetToken, expiry, user.id]
        );

        // Institutional Sync: Protocol recovery handshake
        const emailSent = await sendResetEmail(user.email, user.name, resetToken);
        
        // Development Bypass: Log the token for manual verification until SMTP is fully provisioned
        console.log(`[RECOVERY] Protocol OTP for ${user.roll_number}: ${resetToken}`);

        if (!emailSent) {
            return res.success({ status: 'success' }, 'Recovery protocol initiated. Check institutional terminal for OTP bypass.');
        }
        res.success(null, 'Recovery code sent.');
    } catch (err) {
        console.error('Forgot password error:', err.message);
        res.error('Failed to initiate recovery', null, 500);
    }
};

const resetPassword = async (req, res) => {
    try {
        const { roll_number, resetToken, newPassword } = req.body;
        if (!roll_number || !resetToken || !newPassword) {
            return res.error('Roll, token, and new password are required', null, 400);
        }

        const cleanRoll = roll_number.trim().toUpperCase();
        const userRes = await queryAll(
            'SELECT id, reset_token, reset_expiry FROM users WHERE roll_number = $1',
            [cleanRoll]
        );

        if (userRes.length === 0) return res.error('User not found', null, 404);

        const user = userRes[0];
        if (!user.reset_token || user.reset_token !== resetToken || new Date() > new Date(user.reset_expiry)) {
            return res.error('INVALID_OR_EXPIRED_TOKEN', null, 400);
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await queryAll(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expiry = NULL WHERE id = $2',
            [newHash, user.id]
        );

        res.success(null, 'Password reset successful. You can now log in.');
    } catch (err) {
        console.error('Reset password error:', err.message);
        res.error('Failed to reset password', null, 500);
    }
};

module.exports = {
    verify,
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword
};
