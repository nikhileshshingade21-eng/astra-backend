const { getDb, saveDb, queryAll } = require('../db');

// Haversine formula — calculate distance between two GPS coordinates in meters
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const mark = async (req, res) => {
    try {
        const { class_id, gps_lat, gps_lng } = req.body;
        const db = await getDb();

        if (!gps_lat || !gps_lng) {
            return res.status(400).json({ error: 'GPS coordinates are required' });
        }

        // Check for campus zones
        const zones = queryAll('SELECT id, name, lat, lng, radius_m FROM campus_zones');
        let withinZone = false;
        let nearestDistance = Infinity;
        let zoneName = '';

        if (zones.length && zones[0].values.length) {
            for (const z of zones[0].values) {
                const dist = haversine(gps_lat, gps_lng, z[2], z[3]);
                if (dist < nearestDistance) {
                    nearestDistance = dist;
                    zoneName = z[1];
                }
                if (dist <= z[4]) {
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
            const existing = queryAll(
                'SELECT id FROM attendance WHERE user_id = ? AND class_id = ? AND date = ?',
                [req.user.id, class_id, todayDate]
            );
            if (existing.length && existing[0].values.length) {
                return res.status(409).json({ error: 'Attendance already marked for this class today' });
            }
        }

        // Determine status and enforce TIME WINDOW (last 10 mins)
        let status = 'present';
        if (class_id) {
            const cls = queryAll('SELECT start_time, end_time, name FROM classes WHERE id = ?', [class_id]);
            if (cls.length && cls[0].values.length) {
                const [classStart, classEnd, className] = cls[0].values[0];
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

        db.run(
            `INSERT INTO attendance (user_id, class_id, date, status, gps_lat, gps_lng, distance_m, method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, class_id || null, todayDate, status, gps_lat, gps_lng, Math.round(nearestDistance), 'gps+biometric']
        );

        // Create notification
        db.run(
            `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
            [req.user.id, 'Attendance Marked', `${status === 'present' ? '✓ Present' : '⚠ Late'} — ${todayDate} at ${new Date().toLocaleTimeString()}. Distance: ${Math.round(nearestDistance)}m`, status === 'present' ? 'success' : 'warning']
        );
        saveDb();

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
        const result = queryAll(
            `SELECT a.id, a.date, a.status, a.gps_lat, a.gps_lng, a.distance_m, a.method, a.marked_at,
              c.code, c.name as class_name
       FROM attendance a
       LEFT JOIN classes c ON a.class_id = c.id
       WHERE a.user_id = ?
       ORDER BY a.marked_at DESC
       LIMIT 50`,
            [req.user.id]
        );

        const records = [];
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                records.push({
                    id: row[0], date: row[1], status: row[2], gps_lat: row[3], gps_lng: row[4],
                    distance_m: row[5], method: row[6], marked_at: row[7],
                    class_code: row[8], class_name: row[9]
                });
            }
        }

        res.json({ records });
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
        const clsRes = queryAll('SELECT programme, section FROM classes WHERE id = ?', [classId]);
        if (!clsRes.length || !clsRes[0].values.length) {
            return res.status(404).json({ error: 'Class not found' });
        }
        const [prog, sec] = clsRes[0].values[0];

        // Fetch all students in this section and their attendance for today if it exists
        const result = queryAll(`
            SELECT u.id, u.roll_number, u.name, a.status, a.marked_at
            FROM users u
            LEFT JOIN attendance a ON u.id = a.user_id AND a.class_id = ? AND a.date = ?
            WHERE u.role = 'student' AND u.programme = ? AND u.section = ?
            ORDER BY u.roll_number ASC
        `, [classId, today, prog, sec]);

        const students = [];
        let count = 0;
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                if (row[3]) count++; // marked status exists
                students.push({
                    id: row[0],
                    roll_number: row[1],
                    name: row[2],
                    status: row[3] || null,
                    marked_at: row[4] || null
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
        if (!user_id || !class_id || !status) {
            return res.status(400).json({ error: 'User ID, Class ID, and Status are required' });
        }

        const db = await getDb();
        const todayDate = new Date().toISOString().split('T')[0];

        // Upsert attendance record
        const existing = queryAll(
            'SELECT id FROM attendance WHERE user_id = ? AND class_id = ? AND date = ?',
            [user_id, class_id, todayDate]
        );

        if (existing.length && existing[0].values.length) {
            db.run(
                'UPDATE attendance SET status = ?, marked_at = datetime("now"), method = "faculty_override" WHERE id = ?',
                [status, existing[0].values[0][0]]
            );
        } else {
            db.run(
                `INSERT INTO attendance (user_id, class_id, date, status, method, marked_at)
                 VALUES (?, ?, ?, ?, ?, datetime("now"))`,
                [user_id, class_id, todayDate, status, 'faculty_override']
            );
        }
        
        saveDb();

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
