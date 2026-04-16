/**
 * Socket.IO Contract Registry
 * Strict schemas for real-time emissions to enforce synchronization
 * between React Native and Node backend.
 */

const SOCKET_EVENTS = {
    // Rooms
    JOIN_USER: 'join_user',
    JOIN_CLASS: 'join_class',
    LEAVE_CLASS: 'leave_class',

    // Emits
    LIVE_NOTIFICATION: 'LIVE_NOTIFICATION',
    ATTENDANCE_MARKED: 'ATTENDANCE_MARKED',
    LOCATION_UPDATE: 'LOCATION_UPDATE',

    // Listens
    LIVE_LOCATION_PING: 'LIVE_LOCATION_PING'
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
            
        default:
            return { ...base, data: payload };
    }
};

module.exports = { SOCKET_EVENTS, formatSocketPayload };
