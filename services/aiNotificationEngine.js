const { queryAll } = require('../database_module');

/**
 * Logs a specific user behavior event into the AI Engine.
 * Examples: 'APP_OPEN', 'MARK_ATTENDANCE', 'VIEW_TIMETABLE'
 */
async function logUserActivity(userId, action, metadata = {}) {
    try {
        await queryAll(
            `INSERT INTO user_behavior_logs (user_id, action, metadata) VALUES ($1, $2, $3)`,
            [userId, action, JSON.stringify(metadata)]
        );
        return true;
    } catch (err) {
        console.error(`[AI-ENGINE] Failed to log activity for ${userId}:`, err.message);
        return false;
    }
}

/**
 * Predicts the most likely hour (0-23) a user opens the app, 
 * using historical analytical DB data.
 */
async function predictBestNotificationTime(userId) {
    try {
        // Find most frequent app open hour for this user
        const logs = await queryAll(
            `SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as frequency 
             FROM user_behavior_logs 
             WHERE user_id = $1 AND action = 'APP_OPEN' 
             GROUP BY hour 
             ORDER BY frequency DESC 
             LIMIT 1`,
            [userId]
        );
        
        if (logs.length > 0) {
            return parseInt(logs[0].hour); // Returns the best hour block
        }
        return null; // Fallback to immediate delivery
    } catch (err) {
        console.error(`[AI-ENGINE] Prediction failed:`, err.message);
        return null;
    }
}

/**
 * Checks if current time is within user's declared "Quiet Hours"
 * where pushes should be completely suppressed or delayed.
 */
async function fallsInQuietHours(userId) {
    try {
        const pref = await queryAll(`SELECT quiet_hours_start, quiet_hours_end FROM user_preferences WHERE user_id = $1`, [userId]);
        if (pref.length === 0) return false;
        
        const currentHour = new Date().getHours();
        const startHour = parseInt(pref[0].quiet_hours_start.split(':')[0]);
        const endHour = parseInt(pref[0].quiet_hours_end.split(':')[0]);

        if (startHour > endHour) {
            // e.g., 22:00 to 08:00 (crosses midnight)
            return currentHour >= startHour || currentHour < endHour;
        } else {
            // e.g., 14:00 to 16:00
            return currentHour >= startHour && currentHour < endHour;
        }
    } catch (err) {
        return false;
    }
}

/**
 * Logs successful dispatches into the AI tracking table.
 */
async function logNotificationHistory(userId, type, title, message, status = 'delivered') {
    try {
        await queryAll(
            `INSERT INTO notification_history (user_id, type, title, message, status) VALUES ($1, $2, $3, $4, $5)`,
            [userId, type, title, message, status]
        );
    } catch (err) {
        console.error(`[AI-ENGINE] Failed to log History:`, err.message);
    }
}

module.exports = {
    logUserActivity,
    predictBestNotificationTime,
    fallsInQuietHours,
    logNotificationHistory
};
