/**
 * Normalization Adapter Middleware
 * Translates React Native camelCase payloads into backend snake_case safely.
 */

const keyMappings = {
    classId: 'class_id',
    userId: 'user_id',
    deviceId: 'device_id',
    rollNumber: 'roll_number',
    gpsLat: 'gps_lat',
    gpsLng: 'gps_lng',
    wifiSsid: 'wifi_ssid',
    wifiBssid: 'wifi_bssid',
    fcmToken: 'fcm_token'
};

const normalizePayload = (req, res, next) => {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        const normalized = { ...req.body };
        
        Object.keys(req.body).forEach(key => {
            if (keyMappings[key]) {
                normalized[keyMappings[key]] = req.body[key];
                // Keep the original around just in case a controller explicitly wants it
            }
        });
        
        req.body = normalized;
    }
    
    // Also normalize query params for GET requests
    if (req.query) {
        const normQuery = { ...req.query };
        Object.keys(req.query).forEach(key => {
            if (keyMappings[key]) {
                normQuery[keyMappings[key]] = req.query[key];
            }
        });
        req.query = normQuery;
    }

    next();
};

module.exports = normalizePayload;
