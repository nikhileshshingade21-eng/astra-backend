/**
 * ASTRA V4 Event Engine (astraEvents)
 * =====================================
 * The central nervous system of ASTRA's predictive architecture.
 *
 * Instead of scattered inline logic, ALL user actions fire events through
 * this singleton EventEmitter. Listeners process events asynchronously
 * with full error isolation — one listener crash doesn't affect others.
 *
 * Design Principle: "Fire & Forget"
 * - Callers emit and move on (non-blocking)
 * - Listeners handle prediction, logging, and state updates
 * - Built-in debounce prevents duplicate processing
 */

const EventEmitter = require('events');
const { queryAll } = require('../database_module');
const { shouldProcess } = require('./debounceService');
const personaEngine = require('./personaEngine');
const AIEngine = require('./aiNotificationEngine');

// ─── EVENT TYPE CONSTANTS ───────────────────────────────────────────────────

const ASTRA_EVENTS = {
    USER_LOGIN:         'USER_LOGIN',
    USER_LOGOUT:        'USER_LOGOUT',
    USER_REGISTERED:    'USER_REGISTERED',
    APP_BACKGROUNDED:   'APP_BACKGROUNDED',
    APP_RESUMED:        'APP_RESUMED',
    LOCATION_SCAN:      'LOCATION_SCAN',
    ATTENDANCE_MARKED:  'ATTENDANCE_MARKED',
    ACTIVITY_PING:      'ACTIVITY_PING',
    CLASS_STARTED:      'CLASS_STARTED',
    CLASS_ENDED:        'CLASS_ENDED',
};

// ─── SINGLETON EMITTER ──────────────────────────────────────────────────────

class AstraEventEngine extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Allow many listeners for different subsystems
        this._initialized = false;
    }

    /**
     * Initialize all event listeners. Called once at server startup.
     * Each listener is wrapped in try-catch for error isolation.
     */
    initialize() {
        if (this._initialized) return;
        this._initialized = true;
        console.log('[ASTRA V4] ⚡ Event Engine initializing...');

        // ─── USER_LOGIN ─────────────────────────────────────────────
        this.on(ASTRA_EVENTS.USER_LOGIN, async (payload) => {
            try {
                const { userId } = payload;
                if (!shouldProcess('login_event', userId)) return;

                // Mark user as online
                await queryAll(
                    'UPDATE users SET is_online = true, last_active_at = NOW(), expected_return = NULL WHERE id = $1',
                    [userId]
                );

                // Reclassify persona on login (lightweight — uses cached attendance data)
                await personaEngine.classifyUserPersona(userId);

                // Update habit matrix
                await personaEngine.updateHabitMatrix(userId);

                // Record actual return (closes any open prediction)
                await personaEngine.recordActualReturn(userId, ASTRA_EVENTS.USER_LOGIN);

                // Log to AI behavior engine
                await AIEngine.logUserActivity(userId, 'APP_OPEN', {
                    event: ASTRA_EVENTS.USER_LOGIN,
                    timestamp: new Date().toISOString()
                });

                console.log(`[ASTRA V4] 🟢 User ${userId} online. Persona reclassified.`);
            } catch (err) {
                console.error(`[ASTRA V4] USER_LOGIN handler error for ${payload?.userId}:`, err.message);
            }
        });

        // ─── USER_LOGOUT ────────────────────────────────────────────
        this.on(ASTRA_EVENTS.USER_LOGOUT, async (payload) => {
            try {
                const { userId } = payload;

                // Mark user offline + calculate expected return
                await queryAll(
                    'UPDATE users SET is_online = false WHERE id = $1',
                    [userId]
                );

                await personaEngine.calculateExpectedReturn(userId, ASTRA_EVENTS.USER_LOGOUT);

                console.log(`[ASTRA V4] 🔴 User ${userId} offline. Expected return calculated.`);
            } catch (err) {
                console.error(`[ASTRA V4] USER_LOGOUT handler error for ${payload?.userId}:`, err.message);
            }
        });

        // ─── USER_REGISTERED ────────────────────────────────────────
        this.on(ASTRA_EVENTS.USER_REGISTERED, async (payload) => {
            try {
                const { userId } = payload;

                // Initialize with neutral persona
                await queryAll(`
                    UPDATE users 
                    SET risk_persona = 'neutral', risk_score = 50, grace_period_minutes = 30,
                        is_online = true, last_active_at = NOW()
                    WHERE id = $1
                `, [userId]);

                console.log(`[ASTRA V4] 🆕 User ${userId} registered. Initialized as neutral.`);
            } catch (err) {
                console.error(`[ASTRA V4] USER_REGISTERED handler error for ${payload?.userId}:`, err.message);
            }
        });

        // ─── APP_BACKGROUNDED ───────────────────────────────────────
        this.on(ASTRA_EVENTS.APP_BACKGROUNDED, async (payload) => {
            try {
                const { userId } = payload;
                if (!shouldProcess('app_background', userId)) return;

                // Calculate when they're expected to return
                const expectedReturn = await personaEngine.calculateExpectedReturn(
                    userId, ASTRA_EVENTS.APP_BACKGROUNDED
                );

                // Update habit matrix (records background time)
                await personaEngine.updateHabitMatrix(userId);

                console.log(`[ASTRA V4] 📱 User ${userId} backgrounded. Expected return: ${expectedReturn?.toISOString() || 'N/A'}`);
            } catch (err) {
                console.error(`[ASTRA V4] APP_BACKGROUNDED handler error for ${payload?.userId}:`, err.message);
            }
        });

        // ─── APP_RESUMED ────────────────────────────────────────────
        this.on(ASTRA_EVENTS.APP_RESUMED, async (payload) => {
            try {
                const { userId } = payload;
                if (!shouldProcess('app_resume', userId)) return;

                // Record actual return (closes prediction)
                await personaEngine.recordActualReturn(userId, ASTRA_EVENTS.APP_RESUMED);

                // Mark online again
                await queryAll(
                    'UPDATE users SET is_online = true, last_active_at = NOW(), expected_return = NULL WHERE id = $1',
                    [userId]
                );

                // Update habit matrix
                await personaEngine.updateHabitMatrix(userId);

                console.log(`[ASTRA V4] 📱 User ${userId} resumed.`);
            } catch (err) {
                console.error(`[ASTRA V4] APP_RESUMED handler error for ${payload?.userId}:`, err.message);
            }
        });

        // ─── ACTIVITY_PING ──────────────────────────────────────────
        this.on(ASTRA_EVENTS.ACTIVITY_PING, async (payload) => {
            try {
                const { userId } = payload;
                if (!shouldProcess('activity_ping', userId)) return;

                // Just update last_active_at and keep online
                await queryAll(
                    'UPDATE users SET last_active_at = NOW(), is_online = true WHERE id = $1',
                    [userId]
                );
            } catch (err) {
                // Silent fail for pings — they're high frequency
            }
        });

        // ─── ATTENDANCE_MARKED ──────────────────────────────────────
        this.on(ASTRA_EVENTS.ATTENDANCE_MARKED, async (payload) => {
            try {
                const { userId, className, status } = payload;

                // Update last activity
                await queryAll(
                    'UPDATE users SET last_active_at = NOW(), is_online = true, expected_return = NULL WHERE id = $1',
                    [userId]
                );

                // Record return (closes any pending prediction)
                await personaEngine.recordActualReturn(userId, ASTRA_EVENTS.ATTENDANCE_MARKED);

                // Update habit matrix
                await personaEngine.updateHabitMatrix(userId, 45); // Assume 45-min class

                // Log to AI engine
                await AIEngine.logUserActivity(userId, 'MARK_ATTENDANCE', {
                    class: className, status,
                    timestamp: new Date().toISOString()
                });

                console.log(`[ASTRA V4] ✅ Attendance marked for user ${userId}: ${className} (${status})`);
            } catch (err) {
                console.error(`[ASTRA V4] ATTENDANCE_MARKED handler error:`, err.message);
            }
        });

        // ─── LOCATION_SCAN ──────────────────────────────────────────
        this.on(ASTRA_EVENTS.LOCATION_SCAN, async (payload) => {
            try {
                const { userId } = payload;

                // Keep user online and extend expected_return
                await queryAll(
                    'UPDATE users SET last_active_at = NOW(), is_online = true WHERE id = $1',
                    [userId]
                );
            } catch (err) {
                // Silent fail for location scans
            }
        });

        console.log('[ASTRA V4] ⚡ Event Engine online. Listening for:', Object.keys(ASTRA_EVENTS).join(', '));
    }
}

// ─── SINGLETON EXPORT ───────────────────────────────────────────────────────

const astraEvents = new AstraEventEngine();

module.exports = { astraEvents, ASTRA_EVENTS };
