/**
 * 🛡️ ASTRA Threat Detection Service
 * 
 * Centralized threat analyzer that:
 * 1. Sends events to the AI engine for scoring
 * 2. Logs all threats to the database
 * 3. Auto-bans users who exceed thresholds
 * 4. Sends real-time admin notifications
 */

const axios = require('axios');
const { getDb, saveDb, queryAll } = require('../database_module.js');

const AI_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

/**
 * Report a threat event — analyzes via AI, logs it, and takes action
 * @param {string} eventType - gps_spoof, brute_force, role_tamper, biometric_bypass, rapid_requests
 * @param {number} userId - The user who triggered the event
 * @param {object} details - Event-specific data
 * @param {string} ipAddress - Request IP address
 * @returns {object} - Threat analysis result with action taken
 */
async function reportThreat(eventType, userId, details = {}, ipAddress = null) {
    const db = await getDb();

    // Count recent violations for this user (last 1 hour)
    const recentViolations = await queryAll(
        `SELECT COUNT(*) FROM threat_logs WHERE user_id = ? AND created_at > NOW() - INTERVAL '1 hour'`,
        [userId]
    );
    const violationCount = recentViolations.length ? recentViolations[0].values[0][0] : 0;

    // Send to AI engine for threat scoring
    let analysis = null;
    try {
        const response = await axios.post(`${AI_URL}/api/threat/analyze`, {
            event_type: eventType,
            user_id: userId,
            details: details,
            recent_violations: violationCount,
            ip_address: ipAddress
        }, { timeout: 5000 });
        analysis = response.data;
    } catch (err) {
        // AI engine offline — use local fallback scoring
        console.warn('[THREAT] AI Engine offline, using local scoring:', err.message);
        analysis = localThreatScore(eventType, violationCount, details);
    }

    // Log the threat event to database
    db.run(
        `INSERT INTO threat_logs (user_id, event_type, threat_score, severity, action_taken, details, ip_address, ai_recommendation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            eventType,
            analysis.threat_score,
            analysis.severity,
            analysis.action,
            JSON.stringify(details),
            ipAddress,
            analysis.recommendation
        ]
    );

    // Execute the recommended action
    if (analysis.action === 'lockdown' || analysis.action === 'block') {
        await banUser(userId, analysis);
    }

    // Alert ALL admins
    await alertAdmins(userId, eventType, analysis);

    saveDb();

    console.warn(`[🛡️ THREAT] User ${userId} | ${eventType} | Score: ${analysis.threat_score} | Action: ${analysis.action}`);

    return analysis;
}

/**
 * Local fallback threat scoring when AI engine is offline
 */
function localThreatScore(eventType, recentViolations, details) {
    const weights = {
        gps_spoof: 35, brute_force: 25, role_tamper: 50,
        biometric_bypass: 40, rapid_requests: 20
    };

    let score = weights[eventType] || 10;
    if (recentViolations >= 3) score = Math.min(100, score * 2);
    if (recentViolations >= 5) score = 100;

    let severity, action;
    if (score >= 80) { severity = 'critical'; action = 'lockdown'; }
    else if (score >= 60) { severity = 'high'; action = 'block'; }
    else if (score >= 35) { severity = 'medium'; action = 'warn'; }
    else { severity = 'low'; action = 'monitor'; }

    return {
        threat_score: score,
        severity,
        action,
        reason: `[LOCAL] ${eventType} detected (AI offline)`,
        recommendation: `Fallback scoring: ${action} recommended`
    };
}

/**
 * Ban/lock a user account
 */
async function banUser(userId, analysis) {
    const db = await getDb();

    // Check if already banned
    const existingBan = await queryAll(
        `SELECT id FROM banned_users WHERE user_id = ? AND unbanned = 0 AND (expires_at IS NULL OR expires_at > NOW())`,
        [userId]
    );
    if (existingBan.length && existingBan[0].values.length) return; // Already banned

    // Determine ban duration based on severity
    let expiresAt = null;
    let isPermanent = 0;

    if (analysis.action === 'lockdown') {
        isPermanent = 1; // Permanent until admin reviews
    } else {
        // Temporary 1-hour block
        expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }

    db.run(
        `INSERT INTO banned_users (user_id, reason, threat_score, expires_at, is_permanent)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, analysis.reason, analysis.threat_score, expiresAt, isPermanent]
    );

    // Notify the user they've been blocked
    db.run(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
        [userId, '⛔ Account Suspended', `Your account has been suspended due to: ${analysis.reason}. Contact admin for appeal.`, 'danger']
    );

    console.warn(`[🔒 BANNED] User ${userId} | Permanent: ${isPermanent} | Score: ${analysis.threat_score}`);
}

/**
 * Send alert notifications to ALL admin users
 */
async function alertAdmins(userId, eventType, analysis) {
    const db = await getDb();

    // Get user info for the alert
    const userInfo = await queryAll('SELECT roll_number, name FROM users WHERE id = ?', [userId]);
    let userName = 'Unknown';
    let rollNumber = 'N/A';
    if (userInfo.length && userInfo[0].values.length) {
        rollNumber = userInfo[0].values[0][0];
        userName = userInfo[0].values[0][1];
    }

    // Find all admin users
    const admins = await queryAll("SELECT id FROM users WHERE role = 'admin'");
    if (admins.length && admins[0].values.length) {
        for (const row of admins[0].values) {
            const adminId = row[0];
            db.run(
                `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
                [
                    adminId,
                    `🚨 THREAT ALERT: ${analysis.severity.toUpperCase()}`,
                    `[${eventType.toUpperCase()}] Student ${userName} (${rollNumber}) | Score: ${analysis.threat_score}/100 | Action: ${analysis.action} | ${analysis.reason}`,
                    'danger'
                ]
            );
        }
    }
}

/**
 * Check if a user is currently banned
 * @returns {object|null} Ban record if banned, null if clear
 */
async function isUserBanned(userId) {
    const result = await queryAll(
        `SELECT id, reason, threat_score, banned_at, expires_at, is_permanent 
         FROM banned_users 
         WHERE user_id = ? AND unbanned = 0 
         AND (is_permanent = 1 OR expires_at > NOW())
         ORDER BY banned_at DESC LIMIT 1`,
        [userId]
    );

    if (result.length && result.length > 0 && result[0].values.length) {
        const row = result[0].values[0];
        return {
            id: row[0],
            reason: row[1],
            threat_score: row[2],
            banned_at: row[3],
            expires_at: row[4],
            is_permanent: !!row[5]
        };
    }
    return null;
}

module.exports = {
    reportThreat,
    isUserBanned,
    banUser,
    alertAdmins
};
