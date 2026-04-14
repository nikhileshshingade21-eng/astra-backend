const { getDb, queryAll } = require('../database_module.js');
const { getLocalDate } = require('../utils/dateUtils');
const aiService = require('../services/aiService');

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
}

const getDashboardStats = async (req, res) => {
    try {
        const db = await getDb();
        const userId = req.user.id;

        // Total attendance records
        const totalResult = await queryAll('SELECT COUNT(*) as count FROM attendance WHERE user_id = $1', [userId]);
        const totalAttended = totalResult.length ? parseInt(totalResult[0].count) : 0;

        // Present count
        const presentResult = await queryAll("SELECT COUNT(*) as count FROM attendance WHERE user_id = $1 AND status = 'present'", [userId]);
        const presentCount = presentResult.length ? parseInt(presentResult[0].count) : 0;

        // Late count
        const lateResult = await queryAll("SELECT COUNT(*) as count FROM attendance WHERE user_id = $1 AND status = 'late'", [userId]);
        const lateCount = lateResult.length ? parseInt(lateResult[0].count) : 0;

        // Total classes available (for the user's programme/section)
        let totalClasses = 0;
        if (req.user.programme && req.user.section) {
            const classResult = await queryAll(
                'SELECT COUNT(*) as count FROM classes WHERE programme = $1 AND section = $2',
                [req.user.programme, req.user.section]
            );
            totalClasses = classResult.length ? parseInt(classResult[0].count) : 0;
        }

        // Attendance percentage (Present + Late are both 'attended')
        const attendedTotal = presentCount + lateCount;
        const percentage = totalAttended > 0 ? Math.round((attendedTotal / totalAttended) * 100) : 0;

        // Streak — consecutive days with attendance
        let streak = 0;
        const streakResult = await queryAll(
            `SELECT DISTINCT date FROM attendance WHERE user_id = $1 ORDER BY date DESC LIMIT 30`,
            [userId]
        );
        if (streakResult.length > 0) {
            const dates = streakResult.map(r => r.date);
            const today = new Date();
            for (let i = 0; i < dates.length; i++) {
                const expectedDate = new Date();
                expectedDate.setDate(expectedDate.getDate() - i);
                const offset = expectedDate.getTimezoneOffset();
                const localExpected = new Date(expectedDate.getTime() - (offset * 60 * 1000));
                const expectedStr = localExpected.toISOString().split('T')[0];
                if (dates[i] === expectedStr) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        // Recent activity (last 5)
        const recentResult = await queryAll(
            `SELECT a.date, a.status, a.marked_at, c.code as class_code, c.name as class_name
       FROM attendance a LEFT JOIN classes c ON a.class_id = c.id
       WHERE a.user_id = $1 ORDER BY a.marked_at DESC LIMIT 5`,
            [userId]
        );
        const recent = recentResult || [];

        // Today's attendance count
        const today = getLocalDate();
        const todayResult = await queryAll('SELECT COUNT(*) as count FROM attendance WHERE user_id = $1 AND date = $2', [userId, today]);
        const todayCount = todayResult.length ? parseInt(todayResult[0].count) : 0;

        // --- ASTRA V3: GAMIFICATION AND SUBJECT BREAKDOWN ---
        const points = (presentCount * 50) + (lateCount * 20);
        
        // Simple rank calculation (comparing present_count with others)
        const rankResult = await queryAll(
            'SELECT COUNT(*) as rank FROM (SELECT user_id, COUNT(*) as c FROM attendance WHERE status = \'present\' GROUP BY user_id) as leaderboard WHERE leaderboard.c > $1',
            [presentCount]
        );
        const rank = (rankResult.length ? parseInt(rankResult[0].rank) : 0) + 1;

        // Subject breakdown (group by name/code across all instances)
        const subjectResult = await queryAll(
            `SELECT c.code, c.name, 
              COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
              COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
              COUNT(a.id) as total_attendance,
              (SELECT COUNT(*) FROM classes c2 WHERE c2.name = c.name AND c2.programme = $2 AND c2.section = $3) as scheduled_count
             FROM classes c
             LEFT JOIN attendance a ON c.id = a.class_id AND a.user_id = $1
             WHERE c.programme = $2 AND c.section = $3
             GROUP BY c.code, c.name`,
            [userId, req.user.programme || 'all', req.user.section || 'all']
        );
        
        const subjects = subjectResult.map((s, i) => {
            const attended = parseInt(s.present) + (parseInt(s.late) || 0);
            const total = parseInt(s.total_attendance);
            const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
            const target = 0.75;
            let can_bunk = 0;
            let must_attend = 0;
            
            if (total > 0) {
                if (pct >= 75) {
                    can_bunk = Math.max(0, Math.floor((attended - target * total) / target));
                } else {
                    must_attend = Math.max(0, Math.ceil((target * total - attended) / (1 - target)));
                }
            }

            const colors = ['#0ea5e9', '#6366f1', '#10b981', '#3b82f6', '#f59e0b'];
            return {
                name: s.name,
                code: s.code,
                pct: pct,
                can_bunk,
                must_attend,
                color: colors[i % colors.length]
            };
        });

        // --- NEW: CALENDAR RIBBON DATA (Last 7 days + Next 3 days) ---
        const dailyStats = [];
        const ribbonRange = 10; // Total 10 days
        for (let i = -7; i <= 3; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            const dateStr = localDate.toISOString().split('T')[0];
            const isFuture = i > 0;
            const isToday = i === 0;

            const dayAttendance = await queryAll(
                'SELECT status FROM attendance WHERE user_id = $1 AND date = $2 LIMIT 1',
                [userId, dateStr]
            );

            let status = 'upcoming';
            if (dayAttendance.length > 0) {
                status = dayAttendance[0].status; // 'present' or 'late'
            } else if (!isFuture && !isToday) {
                // Check if it's a weekend (Sunday = 0, Saturday = 6)
                const dayOfWeek = date.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    status = 'absent';
                } else {
                    status = 'weekend';
                }
            }

            dailyStats.push({
                date: dateStr,
                dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
                dayNum: date.getDate(),
                status: status,
                isToday
            });
        }

        // --- Role-Based Data Aggregation ---
        let responseData = {
            total_attended: totalAttended,
            present_count: presentCount,
            late_count: lateCount,
            total_classes: totalClasses,
            percentage,
            streak,
            points,
            rank,
            subjects,
            today_count: todayCount,
            recent,
            daily_stats: dailyStats
        };

        // --- NEW: BUNK CALCULATOR LOGIC (Mathematically Accurate) ---
        const A = presentCount + lateCount;
        const T = totalAttended;
        const target = 0.75;
        let bunkData = { can_bunk: 0, must_attend: 0 };

        if (T > 0) {
            const currentPct = A / T;
            if (currentPct >= target) {
                // How many more can we miss? (A / (T + x) >= 0.75)
                // x <= (A - 0.75T) / 0.75
                bunkData.can_bunk = Math.max(0, Math.floor((A - target * T) / target));
            } else {
                // How many more must we attend consecutively? ((A + y) / (T + y) >= 0.75)
                // y >= (0.75T - A) / (1 - 0.75)
                bunkData.must_attend = Math.max(0, Math.ceil((target * T - A) / (1 - target)));
            }
        }
        responseData.bunk_stats = bunkData;

        // --- ASTRA 2.0: TODAY'S CLASSES WITH LIVE STATUS ---
        if (req.user.programme && req.user.section) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const now = new Date();
            const currentDay = dayNames[now.getDay()];
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const todayClasses = await queryAll(`
                SELECT c.id, c.code, c.name, c.start_time, c.end_time, c.room, c.faculty, c.day,
                       a.status as attendance_status, a.marked_at
                FROM classes c
                LEFT JOIN attendance a ON c.id = a.class_id AND a.user_id = $1 AND a.date = $4
                WHERE c.programme = $2 AND c.section = $3 AND c.day = $5
                ORDER BY c.start_time ASC
            `, [userId, req.user.programme, req.user.section, today, currentDay]);

            let nextClassIndex = -1;
            const classesWithStatus = todayClasses.map((c, idx) => {
                const startMin = parseTimeToMinutes(c.start_time);
                const endMin = parseTimeToMinutes(c.end_time);
                let liveStatus = 'upcoming';

                if (c.attendance_status === 'present' || c.attendance_status === 'late') {
                    liveStatus = 'attended';
                } else if (currentMinutes >= startMin && currentMinutes < endMin) {
                    liveStatus = 'live';
                } else if (currentMinutes >= endMin) {
                    liveStatus = c.attendance_status === 'absent' ? 'missed' : 'missed';
                } else if (currentMinutes < startMin) {
                    liveStatus = 'upcoming';
                    if (nextClassIndex === -1) nextClassIndex = idx;
                }

                return {
                    ...c,
                    live_status: liveStatus,
                    starts_in_min: Math.max(0, startMin - currentMinutes),
                };
            });

            responseData.today_classes = classesWithStatus;
            responseData.next_class_index = nextClassIndex;
            if (nextClassIndex >= 0) {
                responseData.next_class_in_min = classesWithStatus[nextClassIndex].starts_in_min;
            }
        }

        // --- NEW: ASTRA 2.0 BADGE ENGINE ---
        // Evaluate and award badges based on streak and rank
        const badgesToAward = [];
        if (totalAttended > 0) badgesToAward.push('first_step'); // First Class
        if (streak >= 7) badgesToAward.push('week_warrior'); // 7 Day Streak
        if (streak >= 14) badgesToAward.push('epic_streak'); // 14 Day Streak
        if (rank === 1) badgesToAward.push('centurion'); // Top Rank

        if (badgesToAward.length > 0) {
            try {
                // Using db directly here or a script? We need to use `getDb` since we are in a controller.
                const db = require('../database_module.js').getDb();
                const insertBadge = db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)');
                badgesToAward.forEach(badgeId => {
                    insertBadge.run(userId, badgeId);
                });
            } catch (err) {
                console.warn('[Badge Engine] Error awarding badges:', err.message);
            }
        }

        // Fetch user's unlocked badges to send payload
        const userBadges = await queryAll('SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = $1 ORDER BY unlocked_at DESC', [userId]);
        
        // Map backend IDs to frontend display properties
        const BADGE_META = {
            'first_step': { id: 'first_step', title: 'First Step', icon: 'footsteps', color: '#ffb74d' }, // Gold
            'week_warrior': { id: 'week_warrior', title: 'Week Warrior', icon: 'flame', color: '#ff3d71' }, // Hot
            'epic_streak': { id: 'epic_streak', title: 'Epic Streak', icon: 'flash', color: '#00f2ff' }, // Neon
            'centurion': { id: 'centurion', title: 'Centurion', icon: 'medal', color: '#00ffaa' } // Green
        };
        
        responseData.badges = userBadges.map(b => ({
            ...BADGE_META[b.badge_id],
            unlocked_at: b.unlocked_at
        })).filter(b => b.title); // Filter out unmapped

        if (req.user.role === 'admin') {
            const threatLogs = await queryAll(`
                SELECT t.event_type as type, t.severity, t.details, t.created_at as time, u.name as user_name
                FROM threat_logs t
                LEFT JOIN users u ON t.user_id = u.id
                ORDER BY t.created_at DESC LIMIT 5
            `);
            const sysStats = await queryAll(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM attendance WHERE date = $1) as today_att,
                    (SELECT COUNT(*) FROM campus_zones) as zones
            `, [today]);

            responseData.admin_data = {
                security_feed: threatLogs || [],
                system_stats: sysStats[0] || {}
            };
        }

        if (req.user.role === 'faculty') {
            const facultyDept = req.user.programme || 'all';
            const facultySec = req.user.section || 'all';
            
            // Total students in their department
            const studentCountRes = await queryAll(
                'SELECT COUNT(*) as count FROM users WHERE role = \'student\' AND programme = $1 AND section = $2',
                [facultyDept, facultySec]
            );
            
            // Sessions today for this faculty's registry
            const sessionsTodayRes = await queryAll(
                'SELECT COUNT(*) as count FROM classes WHERE programme = $1 AND section = $2',
                [facultyDept, facultySec]
            );

            responseData.faculty_data = {
                total_students: studentCountRes.length ? parseInt(studentCountRes[0].count) : 0,
                sessions_today: sessionsTodayRes.length ? parseInt(sessionsTodayRes[0].count) : 0
            };
        }

        // ASTRA V2 Predictive Insights (Only for students)
        if (req.user.role === 'student') {
            let predictedMarks = null;
            let driftAnalysis = null;
            try {
                const historicalMarks = [75, 82, 78, 85, 80];
                const recentAttArray = percentage > 0 ? [percentage/100, percentage/100, percentage/100] : [0,0,0];
                const [prediction, drift] = await Promise.all([
                    aiService.getPredictedMarks(userId, historicalMarks, recentAttArray),
                    aiService.getAttendanceDrift(userId, historicalMarks, recentAttArray)
                ]);
                predictedMarks = prediction;
                driftAnalysis = drift;
            } catch (e) {
                console.error('AI aggregation error:', e);
            }
            responseData.predictive_insights = {
                predicted_marks: predictedMarks,
                drift_analysis: driftAnalysis
            };
        }

        res.json(responseData);
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
};

module.exports = {
    getDashboardStats
};
