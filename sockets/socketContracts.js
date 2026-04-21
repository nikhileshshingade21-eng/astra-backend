/**
 * Socket.IO Contract Registry
 * Strict schemas for real-time emissions to enforce synchronization
 * between React Native and Node backend.
 *
 * V4: Added app lifecycle events + overdue alerts for predictive architecture.
 */

const SOCKET_EVENTS = {
    // Rooms
    JOIN_USER: 'join_user',
    JOIN_CLASS: 'join_class',
    LEAVE_CLASS: 'leave_class',

    // Emits (Server → Client)
    LIVE_NOTIFICATION: 'LIVE_NOTIFICATION',
    ATTENDANCE_MARKED: 'ATTENDANCE_MARKED',
    LOCATION_UPDATE: 'LOCATION_UPDATE',
    OVERDUE_ALERT: 'OVERDUE_ALERT',         // V4: Persona-aware overdue nudge
    PERSONA_UPDATE: 'PERSONA_UPDATE',       // V4: Persona reclassification result

    // Listens (Client → Server)
    LIVE_LOCATION_PING: 'LIVE_LOCATION_PING',
    APP_BACKGROUNDED: 'APP_BACKGROUNDED',   // V4: App sent to background
    APP_RESUMED: 'APP_RESUMED',             // V4: App brought to foreground
    ACTIVITY_PING: 'ACTIVITY_PING',         // V4: Lightweight heartbeat
};

const formatSocketPayload = (event, payload) => {
    // Normalizer to ensure consistent socket message payloads just like HTTP
    const base = {
        success: true,
        event: event,
        timestamp: new Date().toISOString()
    };

    switch (event) {
        case SOCKET_EVENTS.LIVE_NOTIFICATION:
            // e.g., payload = { title, body, icon }
            return { ...base, data: payload };
            
        case SOCKET_EVENTS.ATTENDANCE_MARKED:
            // e.g., payload = { student: {...}, timestamp }
            return {
                ...base,
                data: {
                    roll_number: payload.roll_number || payload.rollNumber,
                    name: payload.name,
                    status: 'present',
                    verified_by: payload.verified_by || 'system'
                }
            };

        case SOCKET_EVENTS.LOCATION_UPDATE:
            // payload = { roll_number, name, lat, lng }
            return {
                ...base,
                data: {
                    roll_number: payload.roll_number,
                    name: payload.name,
                    lat: payload.lat,
                    lng: payload.lng,
                    status: payload.status || 'online'
                }
            };

        case SOCKET_EVENTS.OVERDUE_ALERT:
            // V4: payload = { title, body, persona, risk_score }
            return {
                ...base,
                data: {
                    title: payload.title,
                    body: payload.body,
                    persona: payload.persona || 'neutral',
                    risk_score: payload.risk_score || 50,
                    type: 'overdue_alert'
                }
            };

        case SOCKET_EVENTS.PERSONA_UPDATE:
            // V4: payload = { persona, risk_score, grace_period_minutes }
            return {
                ...base,
                data: {
                    persona: payload.persona,
                    risk_score: payload.risk_score,
                    grace_period_minutes: payload.grace_period_minutes
                }
            };
            
        default:
            return { ...base, data: payload };
    }
};

module.exports = { SOCKET_EVENTS, formatSocketPayload };
