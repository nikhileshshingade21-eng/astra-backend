const { getDb, queryAll, saveDb } = require('../database_module.js');
const aiService = require('../services/aiService');

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

        // Attendance percentage
        const percentage = totalAttended > 0 ? Math.round((presentCount / totalAttended) * 100) : 0;

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
                const expected = new Date(today);
                expected.setDate(expected.getDate() - i);
                const expectedStr = expected.toISOString().split('T')[0];
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
        const today = new Date().toISOString().split('T')[0];
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
              COUNT(a.id) as total_attendance,
              (SELECT COUNT(*) FROM classes c2 WHERE c2.name = c.name AND c2.programme = $2 AND c2.section = $3) as scheduled_count
             FROM classes c
             LEFT JOIN attendance a ON c.id = a.class_id AND a.user_id = $1
             WHERE c.programme = $2 AND c.section = $3
             GROUP BY c.code, c.name`,
            [userId, req.user.programme || 'all', req.user.section || 'all']
        );
        
        const subjects = subjectResult.map((s, i) => {
            // ... (keep existing subjects logic)
            const pct = s.total_attendance > 0 ? Math.round((parseInt(s.present) / parseInt(s.total_attendance)) * 100) : 0;
            const colors = ['#0ea5e9', '#6366f1', '#10b981', '#3b82f6', '#f59e0b'];
            return {
                name: s.name,
                code: s.code,
                pct: pct,
                color: colors[i % colors.length]
            };
        });

        // --- NEW: CALENDAR RIBBON DATA (Last 7 days + Next 3 days) ---
        const dailyStats = [];
        const ribbonRange = 10; // Total 10 days
        for (let i = -7; i <= 3; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
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
