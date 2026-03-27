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
 */
async function reportThreat(eventType, userId, details = {}, ipAddress = null) {
    // 1. FAST SCORE: Get a preliminary score instantly
    // We count recent violations (last 1 hour) - this is fast indexed query
    const recentViolations = await queryAll(
        `SELECT COUNT(*) as count FROM threat_logs WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [userId]
    );
    const violationCount = recentViolations.length ? parseInt(recentViolations[0].count) : 0;

    // Use local scoring as the primary low-latency source
    const localAnalysis = localThreatScore(eventType, violationCount, details);
    
    // 2. BACKGROUND AI ANALYSIS: Trigger AI scoring but don't wait for it unless local score is already High
    // This removes the 5s bottleneck for most users
    const aiPromise = axios.post(`${AI_URL}/api/threat/analyze`, {
        event_type: eventType,
        user_id: userId,
        details: details,
        recent_violations: violationCount,
        ip_address: ipAddress
    }, { timeout: 2000 }).then(res => res.data).catch(() => null);

    // 3. LOGGING (Fire and Forget)
    aiPromise.then(aiResult => {
        const finalAnalysis = aiResult || localAnalysis;
        queryAll(
            `INSERT INTO threat_logs (user_id, event_type, threat_score, severity, action_taken, details, ip_address, ai_recommendation)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                userId, eventType, finalAnalysis.threat_score, finalAnalysis.severity,
                finalAnalysis.action, JSON.stringify(details), ipAddress, finalAnalysis.recommendation
            ]
        ).catch(e => console.error('[THREAT] Background Log Fail:', e.message));
    });

    // 4. IMMEDIATE ACTION: If local score is high enough, block immediately
    if (localAnalysis.action === 'lockdown' || localAnalysis.action === 'block') {
        banUser(userId, localAnalysis).catch(e => console.error('[THREAT] Background Ban Fail:', e.message));
        alertAdmins(userId, eventType, localAnalysis).catch(e => console.error('[THREAT] Background Alert Fail:', e.message));
    }

    console.log(`[🛡️ THREAT_Triage] User ${userId} | ${eventType} | LocalAction: ${localAnalysis.action}`);
    return localAnalysis;
}

/**
 * Local fallback threat scoring when AI engine is offline
 */
function localThreatScore(eventType, recentViolations, details) {
    const weights = {
        gps_spoof: 35, brute_force: 25, role_tamper: 50,
        biometric_bypass: 40, rapid_requests: 20,
        duplicate_attendance_attempt: 15
    };

    let baseScore = weights[eventType] || 10;
    
    // Anomaly weighting
    if (eventType === 'gps_spoof') {
        if (details.speed_kmh > 1000) baseScore += 50; // Teleportation
        else if (details.speed_kmh > 300) baseScore += 30; // Impossible ground speed
        if (details.null_island) baseScore += 40;
    }

    let score = baseScore;
    if (recentViolations >= 2) score += 20;
    if (recentViolations >= 5) score = 100;
    score = Math.min(100, score);

    let severity, action;
    if (score >= 85) { severity = 'critical'; action = 'lockdown'; }
    else if (score >= 65) { severity = 'high'; action = 'block'; }
    else if (score >= 40) { severity = 'medium'; action = 'warn'; }
    else { severity = 'low'; action = 'monitor'; }

    return {
        threat_score: score,
        severity,
        action,
        reason: `[LOCAL_V2] ${eventType} detected. Score: ${score}`,
        recommendation: `Action ${action} enforced by local threat engine.`
    };
}

/**
 * Ban/lock a user account
 */
async function banUser(userId, analysis) {
    try {
        // Check if already banned
        const existingBan = await queryAll(
            `SELECT id FROM banned_users WHERE user_id = $1 AND unbanned = 0 AND (expires_at IS NULL OR expires_at > NOW())`,
            [userId]
        );
        if (existingBan && existingBan.length > 0) return; // Already banned

        // Determine ban duration based on severity
        let expiresAt = null;
        let isPermanent = 0;

        if (analysis.action === 'lockdown') {
            isPermanent = 1; // Permanent until admin reviews
        } else {
            // Temporary 1-hour block
            expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        }

        await queryAll(
            `INSERT INTO banned_users (user_id, reason, threat_score, expires_at, is_permanent)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, analysis.reason, analysis.threat_score, expiresAt, isPermanent]
        );

        // Notify the user they've been blocked
        await queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [userId, '⛔ Account Suspended', `Your account has been suspended due to: ${analysis.reason}. Contact admin for appeal.`, 'danger']
        );

        console.warn(`[🔒 BANNED] User ${userId} | Permanent: ${isPermanent} | Score: ${analysis.threat_score}`);
    } catch (err) {
        console.warn('[THREAT] Ban operation failed (tables may not exist):', err.message);
    }
}

/**
 * Send alert notifications to ALL admin users
 */
async function alertAdmins(userId, eventType, analysis) {
    try {
        // Get user info for the alert
        const userInfo = await queryAll('SELECT roll_number, name FROM users WHERE id = $1', [userId]);
        let userName = 'Unknown';
        let rollNumber = 'N/A';
        if (userInfo && userInfo.length > 0) {
            rollNumber = userInfo[0].roll_number || 'N/A';
            userName = userInfo[0].name || 'Unknown';
        }

        // Find all admin users
        const admins = await queryAll("SELECT id FROM users WHERE role = 'admin'");
        if (admins && admins.length > 0) {
            for (const admin of admins) {
                await queryAll(
                    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                    [
                        admin.id,
                        `🚨 THREAT ALERT: ${analysis.severity.toUpperCase()}`,
                        `[${eventType.toUpperCase()}] Student ${userName} (${rollNumber}) | Score: ${analysis.threat_score}/100 | Action: ${analysis.action} | ${analysis.reason}`,
                        'danger'
                    ]
                );
            }
        }
    } catch (err) {
        console.warn('[THREAT] Admin alert failed:', err.message);
    }
}

/**
 * Check if a user is currently banned
 * @returns {object|null} Ban record if banned, null if clear
 */
async function isUserBanned(userId) {
    try {
        const result = await queryAll(
            `SELECT id, reason, threat_score, banned_at, expires_at, is_permanent 
             FROM banned_users 
             WHERE user_id = $1 AND unbanned = 0 
             AND (is_permanent = 1 OR expires_at > NOW())
             ORDER BY banned_at DESC LIMIT 1`,
            [userId]
        );

        if (result && result.length > 0) {
            const row = result[0];
            return {
                id: row.id,
                reason: row.reason,
                threat_score: row.threat_score,
                banned_at: row.banned_at,
                expires_at: row.expires_at,
                is_permanent: !!row.is_permanent
            };
        }
    } catch (err) {
        // banned_users table may not exist — don't crash auth
        console.warn('[THREAT] Ban check failed (table may not exist):', err.message);
    }
    return null;
}

module.exports = {
    reportThreat,
    isUserBanned,
    banUser,
    alertAdmins
};
