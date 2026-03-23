const { getDb, queryAll, saveDb } = require('../database_module.js');
const { reportThreat } = require('../services/threatService');
const { getOrSetCache } = require('../services/cacheService');

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
        const { class_id, gps_lat, gps_lng } = req.body;
        const db = await getDb();

        if (gps_lat === undefined || gps_lat === null || gps_lng === undefined || gps_lng === null) {
            return res.status(400).json({ error: 'GPS coordinates are required' });
        }

        // 🛡️ AI THREAT DETECTION: GPS anomaly check
        const { warnings, details } = await detectGpsAnomaly(req.user.id, gps_lat, gps_lng);
        if (warnings.length > 0) {
            console.warn(`[🛡️ GPS ANOMALY] User ${req.user.id}: ${warnings.join('; ')}`);
            
            // Report to AI threat engine — this will score, log, and potentially block
            const threat = await reportThreat('gps_spoof', req.user.id, details, req.ip);
            
            // If AI says block or lockdown — STOP the hacker here
            if (threat.action === 'block' || threat.action === 'lockdown') {
                return res.status(403).json({
                    error: '⛔ GPS SPOOFING DETECTED — BLOCKED',
                    threat_score: threat.threat_score,
                    severity: threat.severity,
                    message: threat.reason,
                    action: 'Your account has been flagged. Admin has been notified.'
                });
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
            return res.status(403).json({
                error: 'GEOLOCATION FAILURE',
                distance_m: Math.round(nearestDistance),
                zone: zoneName,
                message: `ACCESS DENIED: You are ${Math.round(nearestDistance)}m away from ${zoneName || 'the institutional perimeter'}. Institutional protocol requires attendance within 50m of a registered campus zone.`
            });
        }

        const todayDate = new Date().toISOString().split('T')[0];
        if (class_id) {
            const existing = await queryAll(
                'SELECT id FROM attendance WHERE user_id = $1 AND class_id = $2 AND date = $3',
                [req.user.id, class_id, todayDate]
            );
            if (existing.length > 0) {
                return res.status(409).json({ error: 'Attendance already marked for this class today' });
            }
        }

        // Determine status and enforce TIME WINDOW (last 10 mins)
        let status = 'present';
        if (class_id) {
            const cls = await queryAll('SELECT start_time, end_time, name FROM classes WHERE id = $1', [class_id]);
            if (cls.length > 0) {
                const { start_time: classStart, end_time: classEnd, name: className } = cls[0];
                const now = new Date();
                
                // Parse class end time
                const [endH, endM] = classEnd.split(':').map(Number);
                const classEndDate = new Date(now);
                classEndDate.setHours(endH, endM, 0, 0);

                // Last 10 minutes logic
                const tenMinsBeforeEnd = new Date(classEndDate.getTime() - 10 * 60000);
                
                if (now < tenMinsBeforeEnd) {
                    return res.status(403).json({
                        error: 'TIME PROTOCOL BREACH',
                        message: `Attendance marking for ${className} is only permitted in the FINAL 10 MINUTES of the session. Protocol opens at ${tenMinsBeforeEnd.toLocaleTimeString()}.`
                    });
                }

                if (now > classEndDate) {
                    status = 'late';
                }
            }
        }

        await queryAll(
            `INSERT INTO attendance (user_id, class_id, date, status, gps_lat, gps_lng, distance_m, method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [req.user.id, class_id || null, todayDate, status, gps_lat, gps_lng, Math.round(nearestDistance), 'gps+biometric']
        );

        await queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [req.user.id, 'Attendance Marked', `${status === 'present' ? '✓ Present' : '⚠ Late'} — ${todayDate} at ${new Date().toLocaleTimeString()}. Distance: ${Math.round(nearestDistance)}m`, status === 'present' ? 'success' : 'warning']
        );

        res.json({
            success: true,
            status,
            distance_m: Math.round(nearestDistance),
            zone: zoneName,
            date: todayDate,
            time: new Date().toLocaleTimeString()
        });
    } catch (err) {
        console.error('Attendance mark error:', err);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
};

const getHistory = async (req, res) => {
    try {
        const db = await getDb();
        const result = await queryAll(
            `SELECT a.id, a.date, a.status, a.gps_lat, a.gps_lng, a.distance_m, a.method, a.marked_at,
              c.code, c.name as class_name
       FROM attendance a
       LEFT JOIN classes c ON a.class_id = c.id
       WHERE a.user_id = $1
       ORDER BY a.marked_at DESC
       LIMIT 50`,
            [req.user.id]
        );

        res.json({ records: result });
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

const getLiveAttendance = async (req, res) => {
    try {
        const { classId } = req.params;
        const db = await getDb();
        const today = new Date().toISOString().split('T')[0];

        // First find the class to get programme and section
        const clsRes = await queryAll('SELECT programme, section FROM classes WHERE id = $1', [classId]);
        if (clsRes.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }
        const { programme: prog, section: sec } = clsRes[0];

        // Fetch all students in this section and their attendance for today if it exists
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

        res.json({
            classId,
            count,
            students
        });
    } catch (err) {
        console.error('Live attendance error:', err);
        res.status(500).json({ error: 'Failed to fetch live attendance' });
    }
};

const manualMark = async (req, res) => {
    try {
        if (req.user.role === 'student') {
            return res.status(403).json({ error: 'Only faculty or admin can perform manual overrides' });
        }

        const { user_id, class_id, status } = req.body;
        // SEC-007 FIX: Validate status against allowed values
        const validStatuses = ['present', 'absent', 'late'];
        if (!user_id || !class_id || !status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Valid User ID, Class ID, and Status (present/absent/late) are required' });
        }

        const db = await getDb();
        const todayDate = new Date().toISOString().split('T')[0];

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

        res.json({ success: true, message: `Attendance for student updated to ${status}` });
    } catch (err) {
        console.error('Manual mark error:', err);
        res.status(500).json({ error: 'Failed to perform manual override' });
    }
};

module.exports = {
    mark,
    getHistory,
    getLiveAttendance,
    manualMark
};
