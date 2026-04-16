/**
 * Centralized Notification Engine
 * Standardizes pushing alerts mapping generic system types
 * to explicitly shaped FCM payloads.
 */

const { getDb, queryAll } = require('../database_module');
const admin = require('./firebaseService'); // It returns the initialized admin object

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

        const title = typeof template.title === 'function' ? template.title(payload) : template.title;
        const body = template.buildBody(payload);

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
            data: { type, ...payload },
            android: {
                priority: template.priority || 'high',
                notification: { channelId: 'astra-high-priority' }
            }
        };

        const response = await admin.messaging().send(message);
        console.log(`[NOTIFY ENGINE] Sent ${type} to user ${userId} => ${response}`);
        return true;
    } catch (e) {
        console.error(`[NOTIFY ENGINE] Error dispatching to user ${userId}:`, e.message);
        return false;
    }
};

module.exports = { sendNotification };
