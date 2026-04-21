/**
 * Centralized Notification Engine V4
 * ====================================
 * Standardizes pushing alerts mapping generic system types
 * to explicitly shaped FCM payloads.
 *
 * V4 Additions:
 * - Persona-aware sentient notification copy
 * - Batch FCM send for sweeper efficiency
 * - OVERDUE_RETURN, PERSONA_NUDGE, STREAK_RISK, SENTIENT_ALERT types
 */

const { getDb, queryAll } = require('../database_module');
const admin = require('./firebaseService'); // It returns the initialized admin object
const socketService = require('./socketService');

// Lazy-load personaEngine to avoid circular dependency
let _personaEngine = null;
function getPersonaEngine() {
    if (!_personaEngine) {
        try { _personaEngine = require('./personaEngine'); } catch (e) { /* not ready yet */ }
    }
    return _personaEngine;
}

const NOTIFICATION_MAP = {
    ATTENDANCE_SUCCESS: {
        title: 'Attendance Verified',
        buildBody: (p) => `You have been marked present for ${p.class_name}.`,
        priority: 'high'
    },
    MISSED_CLASS: {
        title: 'Class Missed',
        buildBody: (p) => `You missed ${p.class_name} today.`,
        priority: 'high'
    },
    ADMIN_BROADCAST: {
        title: (p) => p.title || 'ASTRA Announcement',
        buildBody: (p) => p.content || 'You have a new administrative announcement.',
        priority: 'high'
    },
    // ─── V4 Notification Types ──────────────────────────────────────
    OVERDUE_RETURN: {
        title: (p) => p.title || '👋 We noticed you\'re away',
        buildBody: (p) => p.body || 'Your expected return time has passed. Everything okay?',
        priority: 'high'
    },
    PERSONA_NUDGE: {
        title: (p) => p.title || '📊 Behavior Insight',
        buildBody: (p) => p.body || 'Your attendance pattern has been analyzed.',
        priority: 'normal'
    },
    STREAK_RISK: {
        title: (p) => p.title || '🔥 Streak at risk!',
        buildBody: (p) => p.body || 'Your attendance streak may break if you miss today.',
        priority: 'high'
    },
    SENTIENT_ALERT: {
        title: (p) => p.title || '🧠 ASTRA Insight',
        buildBody: (p) => p.body || 'ASTRA has something to share with you.',
        priority: 'normal'
    }
};

const sendNotification = async (userId, type, payload = {}) => {
    try {
        if (!admin || !admin.apps || admin.apps.length === 0) {
            console.warn('[NOTIFY ENGINE] Firebase not initialized. Skipping push.');
            return false;
        }

        // Match to contract
        const template = NOTIFICATION_MAP[type];
        if (!template) throw new Error(`Unknown Notification Type: ${type}`);

        let title = typeof template.title === 'function' ? template.title(payload) : template.title;
        let body = template.buildBody(payload);

        // V4: If sentient copy is provided, use it directly
        if (payload._sentientTitle) title = payload._sentientTitle;
        if (payload._sentientBody) body = payload._sentientBody;

        // Persist to DB
        await queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [userId, title, body, payload.notificationType || 'info']
        );

        // Real-time push via Socket.IO
        socketService.emitToUser(userId, 'LIVE_NOTIFICATION', {
            title, body, type, timestamp: new Date().toISOString()
        });

        // Fetch User Token
        const users = await queryAll('SELECT fcm_token FROM users WHERE id = $1', [userId]);
        const user = users[0];

        if (!user || !user.fcm_token) {
            console.log(`[NOTIFY ENGINE] No FCM Token for user ${userId}.`);
            return false;
        }

        const message = {
            token: user.fcm_token,
            notification: { title, body },
            data: { type, ...payload, title, body },
            android: { priority: 'high', notification: { sound: 'default', channelId: 'astra-class-reminders' } }
        };

        const response = await admin.messaging().send(message);
        console.log(`[NOTIFY ENGINE] Sent ${type} to user ${userId} => ${response}`);
        return true;
    } catch (e) {
        console.error(`[NOTIFY ENGINE] Error dispatching to user ${userId}:`, e.message);
        // V4: Clear stale FCM tokens
        if (e.code === 'messaging/registration-token-not-registered' || e.message?.includes('not found')) {
            await queryAll('UPDATE users SET fcm_token = NULL WHERE id = $1', [userId]).catch(() => {});
            console.log(`[NOTIFY ENGINE] Cleared stale token for user ${userId}`);
        }
        return false;
    }
};

/**
 * V4: Batch send notifications to multiple users efficiently.
 * Used by the overdue-user sweeper to avoid per-user FCM calls.
 *
 * @param {Array<{userId, title, body, type, persona}>} batch
 * @returns {{ sent: number, failed: number }}
 */
const sendBatchNotifications = async (batch) => {
    if (!batch || batch.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;

    // Collect all user IDs to fetch tokens in one query
    const userIds = [...new Set(batch.map(b => b.userId))];
    let tokenMap = {};

    try {
        if (userIds.length > 0) {
            const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
            const tokenRows = await queryAll(
                `SELECT id, fcm_token FROM users WHERE id IN (${placeholders}) AND fcm_token IS NOT NULL`,
                userIds
            );
            tokenMap = Object.fromEntries(tokenRows.map(r => [r.id, r.fcm_token]));
        }
    } catch (err) {
        console.error('[NOTIFY ENGINE] Batch token fetch failed:', err.message);
    }

    for (const item of batch) {
        try {
            // 1. Persist to DB
            await queryAll(
                `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                [item.userId, item.title, item.body, item.type || 'info']
            );

            // 2. Socket.IO real-time
            socketService.emitToUser(item.userId, 'LIVE_NOTIFICATION', {
                title: item.title, body: item.body, type: item.type || 'overdue_alert',
                persona: item.persona, timestamp: new Date().toISOString()
            });

            // 3. FCM push
            const fcmToken = tokenMap[item.userId];
            if (fcmToken && admin?.apps?.length > 0) {
                try {
                    await admin.messaging().send({
                        notification: { title: item.title, body: item.body },
                        data: { type: item.type || 'overdue_alert', title: item.title, body: item.body },
                        token: fcmToken,
                        android: { priority: 'high', notification: { sound: 'default', channelId: 'astra-class-reminders' } }
                    });
                } catch (fcmErr) {
                    if (fcmErr.code === 'messaging/registration-token-not-registered' || fcmErr.message?.includes('not found')) {
                        await queryAll('UPDATE users SET fcm_token = NULL WHERE id = $1', [item.userId]).catch(() => {});
                    }
                }
            }

            sent++;
        } catch (err) {
            console.error(`[NOTIFY ENGINE] Batch item failed for user ${item.userId}:`, err.message);
            failed++;
        }
    }

    if (sent > 0) console.log(`[NOTIFY ENGINE] Batch complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
};

/**
 * V4: Send a sentient (persona-aware) notification.
 * Uses the personaEngine to generate personality-matched copy.
 *
 * @param {number} userId
 * @param {string} copyType — e.g., 'overdue_return', 'morning_nudge'
 * @param {object} vars — template variables
 */
const sendSentientNotification = async (userId, copyType, vars = {}) => {
    try {
        const pe = getPersonaEngine();
        if (!pe) {
            console.warn('[NOTIFY ENGINE] PersonaEngine not available. Falling back to generic.');
            return false;
        }

        // Get user's persona
        const userRows = await queryAll('SELECT risk_persona FROM users WHERE id = $1', [userId]);
        const persona = userRows[0]?.risk_persona || 'neutral';

        // Generate sentient copy
        const copy = pe.getSentientCopy(copyType, persona, vars);
        if (!copy) return false;

        return await sendNotification(userId, 'SENTIENT_ALERT', {
            _sentientTitle: copy.title,
            _sentientBody: copy.body,
            persona,
            copyType,
            notificationType: 'info'
        });
    } catch (err) {
        console.error(`[NOTIFY ENGINE] Sentient notification failed for user ${userId}:`, err.message);
        return false;
    }
};

module.exports = { sendNotification, sendBatchNotifications, sendSentientNotification, NOTIFICATION_MAP };

