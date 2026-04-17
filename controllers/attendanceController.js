const { getDb, queryAll, saveDb } = require('../database_module.js');
const { reportThreat } = require('../services/threatService');
const { getOrSetCache } = require('../services/cacheService');
const { SOCKET_EVENTS } = require('../sockets/socketContracts');
const { sendNotification } = require('../services/notificationEngine');
const socketService = require('../services/socketService');
const { queryAll: directQuery } = require('../database_module');

const { getLocalDate } = require('../utils/dateUtils');

// Haversine formula — calculate distance between two GPS coordinates in meters
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// VULN-008 FIX: GPS anomaly detection
async function detectGpsAnomaly(userId, gps_lat, gps_lng) {
    const warnings = [];
    const details = {};

    // Check for impossible coordinates (0,0 = Null Island)
    if (gps_lat === 0 && gps_lng === 0) {
        warnings.push('Coordinates at Null Island (0,0) — likely spoofed');
        details.null_island = true;
    }

    // Check for out-of-range coordinates
    if (Math.abs(gps_lat) > 90 || Math.abs(gps_lng) > 180) {
        warnings.push('Coordinates out of valid range');
    }

    // Check for suspiciously exact coordinates (too many decimal places all zeros)
    const latStr = String(gps_lat);
    const lngStr = String(gps_lng);
    if (latStr.endsWith('000') && lngStr.endsWith('000')) {
        warnings.push('Suspiciously round coordinates — possible spoofing');
        details.round_coords = true;
    }

    // Velocity check: compare with last attendance record
    const lastRecord = await queryAll(
        'SELECT gps_lat, gps_lng, marked_at FROM attendance WHERE user_id = $1 AND gps_lat IS NOT NULL ORDER BY marked_at DESC LIMIT 1',
        [userId]
    );

    if (lastRecord.length > 0) {
        const lastRow = lastRecord[0];
        const { gps_lat: lastLat, gps_lng: lastLng, marked_at: lastTime } = lastRow;
        if (lastLat && lastLng && lastTime) {
            const distMeters = haversine(gps_lat, gps_lng, parseFloat(lastLat), parseFloat(lastLng));
            const timeDiffMs = new Date() - new Date(lastTime);
            const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

            if (timeDiffHours > 0) {
                const speedKmh = (distMeters / 1000) / timeDiffHours;
                details.speed_kmh = Math.round(speedKmh);
                // Flag if traveling faster than 200 km/h (teleportation)
                if (speedKmh > 200) {
                    warnings.push(`Impossible travel speed: ${Math.round(speedKmh)} km/h from last known location`);
                }
            }
        }
    }

    return { warnings, details };
}

const mark = async (req, res) => {
    try {
        const { class_id, gps_lat, gps_lng, method } = req.body;
        const db = await getDb();

        // SEC-006 FIX: Request Signing Verification
        const timestamp = req.headers['x-astra-timestamp'];
        const nonce = req.headers['x-astra-nonce'];
        const signature = req.headers['x-astra-signature'];

        if (!timestamp || !nonce || !signature) {
            return res.error('PROTOCOL_VIOLATION: Missing protocol headers', null, 403);
        }

        // 1. Time Window Check (5 mins)
        if (Math.abs(Date.now() - parseInt(timestamp)) > 5 * 60 * 1000) {
            return res.error('PROTOCOL_STALE: Request expired', null, 403);
        }

        // 2. Signature Verification — Uses JWT token as HMAC key (no shared secret)
        const crypto = require('crypto');
        const jwtToken = req.headers.authorization?.split(' ')[1];
        if (!jwtToken) {
            return res.error('PROTOCOL_VIOLATION: Missing auth token for signing', null, 403);
        }
        const signatureBase = `${timestamp}:${nonce}:${class_id || 'general'}:${req.user.id}:${req.user.device_id}`;
        const expectedSignature = crypto.createHmac('sha256', jwtToken)
            .update(signatureBase)
            .digest('hex');

        if (signature !== expectedSignature) {
            return res.error('PROTOCOL_TAMPERED: Invalid request signature', null, 403);
        }

        // 3. QR Protocol Verification (VULN-022 FIX)
        if (method === 'qr_scan') {
            const { qr_t } = req.body; // QR Timestamp from payload
            if (qr_t && Math.abs(Date.now() - parseInt(qr_t)) > 10 * 60 * 1000) {
                return res.error('QR_PROTOCOL_STALE', { message: 'The QR code has expired. Please scan a fresh one.' }, 403);
            }
        }

        // Note: Face verification was removed in favor of strict device-bound biometrics.
        // Handled at the session level via authMiddleware and device_id matching.

        // 3. Nonce Check (Neutralize VULN-017: Replay Attack)
        const { getRedisClient } = require('../services/cacheService');
        const redis = getRedisClient();
        if (redis) {
            const nonceKey = `nonce:${nonce}`;
            const exists = await redis.get(nonceKey);
            if (exists) {
                return res.error('PROTOCOL_REPLAY', { message: 'Request signature already used' }, 403);
            }
            await redis.set(nonceKey, '1', 'EX', 300); // Expire in 5 mins matching window
        }

        // LOG-GEN: High-fidelity request logging
        console.log(`[📡 ATTENDANCE] REQ: User ${req.user.id} | Class: ${class_id || 'GENERAL'} | Method: ${method} | Nonce: ${nonce}`);

        if (gps_lat === undefined || gps_lat === null || gps_lng === undefined || gps_lng === null) {
            return res.error('GPS coordinates are required', null, 400);
        }

        // 🛡️ AI THREAT DETECTION: GPS anomaly check
        const { warnings, details } = await detectGpsAnomaly(req.user.id, gps_lat, gps_lng);
        if (warnings.length > 0) {
            console.warn(`[🛡️ GPS ANOMALY] User ${req.user.id}: ${warnings.join('; ')}`);
            
            // Report to AI threat engine — this will score, log, and potentially block
            const threat = await reportThreat('gps_spoof', req.user.id, details, req.ip);
            
            // If AI says block or lockdown — STOP the hacker here
            if (threat.action === 'block' || threat.action === 'lockdown') {
                return res.error('⛔ GPS SPOOFING DETECTED — BLOCKED', {
                    threat_score: threat.threat_score,
                    severity: threat.severity,
                    message: threat.reason,
                    action: 'Your account has been flagged. Admin has been notified.'
                }, 403);
            }
        }

        // Check for campus zones (Cached for 1 hour to reduce DB load)
        const zones = await getOrSetCache('campus_zones_all', 3600, async () => {
            return await queryAll('SELECT id, name, lat, lng, radius_m FROM campus_zones');
        });
        let withinZone = false;
        let nearestDistance = Infinity;
        let zoneName = '';

        if (zones.length > 0) {
            for (const z of zones) {
                const dist = haversine(gps_lat, gps_lng, z.lat, z.lng);
                if (dist < nearestDistance) {
                    nearestDistance = dist;
                    zoneName = z.name;
                }
                if (z.radius_m && dist <= z.radius_m) {
                    withinZone = true;
                }
            }
        } else {
            // No zones configured — allow attendance from anywhere
            withinZone = true;
            nearestDistance = 0;
            zoneName = 'No zone configured';
        }

        if (!withinZone) {
            return res.error('GEOLOCATION FAILURE', {
                distance_m: Math.round(nearestDistance),
                zone: zoneName,
                message: `ACCESS DENIED: You are ${Math.round(nearestDistance)}m away from ${zoneName || 'the institutional perimeter'}. Institutional protocol requires attendance within 50m of a registered campus zone.`
            }, 403);
        }

        const todayDate = getLocalDate();
        
        // --- ACADEMIC CALENDAR ENFORCEMENT ---
        const calendarEvents = await queryAll(
            'SELECT event_name, type, is_system_holiday FROM academic_calendar WHERE $1 BETWEEN start_date AND end_date AND is_system_holiday = 1 LIMIT 1',
            [todayDate]
        );
        if (calendarEvents.length > 0) {
            const event = calendarEvents[0];
            return res.error('CALENDAR_BLOCK', { 
                message: `Attendance protocol is DISABLED today due to: ${event.event_name} (${event.type.toUpperCase()}).`,
                event: event.event_name 
            }, 403);
        }
        
        // 🛡️ Pre-emptive existence check (UX)
        if (class_id) {
            const existing = await queryAll(
                'SELECT id FROM attendance WHERE user_id = $1 AND class_id = $2 AND date = $3',
                [req.user.id, class_id, todayDate]
            );
            if (existing.length > 0) {
                console.log(`[🔄 IDEMPOTENCY] User ${req.user.id} re-submission for Class ${class_id}. returning 200 OK.`);
                
                // 🚀 FAIL-SAFETY (Final Layer): Log as a minor threat event for audit
                reportThreat('duplicate_attendance_attempt', req.user.id, {
                    class_id,
                    attempted_at: new Date().toISOString()
                }, req.ip).catch(e => console.error('[FAIL-SAFE] Threat log err:', e.message));

                return res.success({ 
                    status: existing[0].status,
                    date: todayDate 
                }, "Attendance confirmed (Idempotent)");
            }
        }

        // Determine status and enforce TIME WINDOW (last 10 mins)
        let status = 'present';
        if (class_id) {
            const cls = await queryAll('SELECT start_time, end_time, name, day FROM classes WHERE id = $1', [class_id]);
            if (cls.length > 0) {
                const { start_time: classStart, end_time: classEnd, name: className, day: classDay } = cls[0];
                const now = new Date();
                
                const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });

                if (classDay && classDay !== currentDayName && classDay !== 'General') {
                    return res.error('DAY PROTOCOL BREACH', {
                        message: `Attendance marking for ${className} is locked. This class is scheduled for ${classDay}, not today (${currentDayName}).`
                    }, 403);
                }

                // Parse class start time to enforce "Class Must Have Started" rule
                const [startH, startM] = classStart.split(':').map(Number);
                const classStartDate = new Date(now);
                classStartDate.setHours(startH, startM, 0, 0);

                // Add 120s grace buffer for server/client clock skew
                const GRACE_BUFFER_MS = 120 * 1000;
                const protocolOpenTime = new Date(classStartDate.getTime() - GRACE_BUFFER_MS);
                
                // Strictly enforce lock BEFORE class starts
                if (now < protocolOpenTime) {
                    return res.error('TIME PROTOCOL BREACH', {
                        message: `Attendance marking for ${className} is locked. You can only mark attendance after the class officially starts at ${classStart}.`
                    }, 403);
                }

                // If class ended completely, consider marking missed timeframe if needed
                const [endH, endM] = classEnd.split(':').map(Number);
                const classEndDate = new Date(now);
                classEndDate.setHours(endH, endM, 0, 0);
                if (now > new Date(classEndDate.getTime() + GRACE_BUFFER_MS)) {
                    // Optional: allow late markings or block them
                    // By default, we let them mark late, which will register as status='late' below
                }

                if (now > classEndDate) {
                    status = 'late';
                }
            }
        }

        // BUG-002 FIX: Atomic Double-Check & Insert (Neutralize Race Conditions)
        try {
            await queryAll(
                `INSERT INTO attendance (user_id, class_id, date, status, gps_lat, gps_lng, distance_m, method)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (user_id, class_id, date) DO NOTHING`,
                [req.user.id, class_id || null, todayDate, status, gps_lat || null, gps_lng || null, Math.round(nearestDistance), method || 'biometric']
            );
        } catch (err) {
            // CHAOS-FIX: Handle 'Unique Violation' race condition during Redis outage
            if (err.code === '23505') {
                console.log(`[🛡️ RACE_RECOVERED] User ${req.user.id} DB Conflict handled as Success.`);
                return res.success({ 
                    status, 
                    date: todayDate 
                }, "Attendance confirmed (Race Condition Recovered)");
            }
            throw err; // Re-throw other errors
        }

        await queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [req.user.id, 'Attendance Marked', `${status === 'present' ? '✓ Present' : '⚠ Late'} — ${todayDate} at ${new Date().toLocaleTimeString()}. Distance: ${Math.round(nearestDistance)}m`, status === 'present' ? 'success' : 'warning']
        );

        // REAL-TIME BROADCAST: Notify faculty/monitor (VULN-020 FIX)
        const userDetails = await queryAll('SELECT name, roll_number FROM users WHERE id = $1', [req.user.id]);
        if (class_id && userDetails.length > 0) {
            console.log(`[🛰️ SOCKET & PUSH] Broadcasting presence for ROLL: ${userDetails[0].roll_number}`);
            
            // 1. Send WebSocket Update using exact Socket Engine Contract
            socketService.broadcastToClass(class_id, SOCKET_EVENTS.ATTENDANCE_MARKED, {
                ...userDetails[0],
                id: req.user.id,
                status,
                marked_at: new Date().toISOString()
            });

            // 2. Send Push Notification using Central Notification Engine
            const classInfo = await queryAll('SELECT name FROM classes WHERE id = $1', [class_id]);
            const classNamePush = classInfo.length > 0 ? classInfo[0].name : 'your class';
            sendNotification(req.user.id, 'ATTENDANCE_SUCCESS', { class_name: classNamePush });
        }

        res.success({
            status,
            distance_m: Math.round(nearestDistance),
            zone: zoneName,
            date: todayDate,
            time: new Date().toLocaleTimeString()
        });
    } catch (err) {
        console.error('Attendance mark error:', err);
        res.error('Failed to mark attendance', null, 500);
    }
};

const getHistory = async (req, res) => {
    try {
        const db = await getDb();
        const result = await queryAll(
            `SELECT a.id, a.date, a.status, a.distance_m, a.method, a.marked_at,
              c.code, c.name as class_name
       FROM attendance a
       LEFT JOIN classes c ON a.class_id = c.id
       WHERE a.user_id = $1
       ORDER BY a.marked_at DESC
       LIMIT 50`,
            [req.user.id]
        );

        res.success({ records: result });
    } catch (err) {
        console.error('History error:', err);
        res.error('Failed to fetch history', null, 500);
    }
};

const getLiveAttendance = async (req, res) => {
    try {
        const { classId } = req.params;
        const db = await getDb();
        const today = getLocalDate();

        // First find the class to get programme and section
        const clsRes = await queryAll('SELECT programme, section FROM classes WHERE id = $1', [classId]);
        if (clsRes.length === 0) {
            return res.error('Class not found', null, 404);
        }
        const { programme: prog, section: sec } = clsRes[0];

        // Fetch all students in this section and their attendance for today
        // SEC-023 FIX: Ensure we only pull strictly necessary PII
        const result = await queryAll(`
            SELECT u.id, u.roll_number, u.name, a.status, a.marked_at
            FROM users u
            LEFT JOIN attendance a ON u.id = a.user_id AND a.class_id = $1 AND a.date = $2
            WHERE u.role = 'student' AND u.programme = $3 AND u.section = $4
            ORDER BY u.roll_number ASC
        `, [classId, today, prog, sec]);

        const students = [];
        let count = 0;
        if (result && result.length > 0) {
            for (const row of result) {
                if (row.status) count++; // marked status exists
                students.push({
                    id: row.id,
                    roll_number: row.roll_number,
                    name: row.name,
                    status: row.status || null,
                    marked_at: row.marked_at || null
                });
            }
        }

        // Get total expected students in this group
        const totalEns = await queryAll(`SELECT COUNT(*) as count FROM users WHERE role = 'student' AND programme = $1 AND section = $2`, [prog, sec]);
        const totalEnrolled = totalEns.length ? parseInt(totalEns[0].count) : 0;

        res.success({
            classId,
            count,
            total_enrolled: totalEnrolled,
            students
        });
    } catch (err) {
        console.error('Live attendance error:', err);
        res.error('Failed to fetch live attendance', null, 500);
    }
};

const manualMark = async (req, res) => {
    try {
        if (req.user.role === 'student') {
            return res.error('Only faculty or admin can perform manual overrides', null, 403);
        }

        const { user_id, class_id, status } = req.body;
        // SEC-007 FIX: Validate status against allowed values
        const validStatuses = ['present', 'absent', 'late'];
        if (!user_id || !class_id || !status || !validStatuses.includes(status)) {
            return res.error('Valid User ID, Class ID, and Status (present/absent/late) are required', null, 400);
        }

        const db = await getDb();
        const todayDate = getLocalDate();

        // Upsert attendance record
        const existing = await queryAll(
            'SELECT id FROM attendance WHERE user_id = $1 AND class_id = $2 AND date = $3',
            [user_id, class_id, todayDate]
        );

        if (existing.length > 0) {
            await queryAll(
                'UPDATE attendance SET status = $1, marked_at = NOW(), method = $2 WHERE id = $3',
                [status, 'faculty_override', existing[0].id]
            );
        } else {
            await queryAll(
                `INSERT INTO attendance (user_id, class_id, date, status, method, marked_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [user_id, class_id, todayDate, status, 'faculty_override']
            );
        }

        // --- BRIDGE: LIVE NOTIFICATION TO STUDENT ---
        try {
            const classInfo = await queryAll('SELECT name, code FROM classes WHERE id = $1', [class_id]);
            if (classInfo.length > 0) {
                const className = classInfo[0].name;
                const statusLabel = status.toUpperCase();
                
                socketService.emitToUser(user_id, SOCKET_EVENTS.LIVE_NOTIFICATION, {
                    title: `✅ Attendance Verified`,
                    body: `Faculty marked you ${statusLabel} for ${className}.`,
                    type: 'attendance_update',
                    status: status,
                    class_name: className
                });
            }
        } catch (socErr) {
            console.error('[BRIDGE_ERR] Live pulse failed:', socErr.message);
        }

        res.success(null, `Attendance for student updated to ${status}`);
    } catch (err) {
        console.error('Manual mark error:', err);
        res.error('Failed to perform manual override', null, 500);
    }
};

const getAttendanceStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const totalResult = await queryAll('SELECT COUNT(*) as count FROM attendance WHERE user_id = $1', [userId]);
        const total = totalResult.length ? parseInt(totalResult[0].count) : 0;

        const presentResult = await queryAll("SELECT COUNT(*) as count FROM attendance WHERE user_id = $1 AND status IN ('present', 'late')", [userId]);
        const attended = presentResult.length ? parseInt(presentResult[0].count) : 0;

        const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;

        res.success({ attended, total, percentage });
    } catch (err) {
        console.error('Attendance stats error:', err);
        res.error('Failed to fetch attendance stats', null, 500);
    }
};

module.exports = {
    mark,
    getHistory,
    getLiveAttendance,
    manualMark,
    getAttendanceStats
};
