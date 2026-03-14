const { getDb, queryAll } = require('../db');

const getDashboardStats = async (req, res) => {
    try {
        const db = await getDb();
        const userId = req.user.id;

        // Total attendance records
        const totalResult = queryAll('SELECT COUNT(*) FROM attendance WHERE user_id = ?', [userId]);
        const totalAttended = totalResult.length ? totalResult[0].values[0][0] : 0;

        // Present count
        const presentResult = queryAll("SELECT COUNT(*) FROM attendance WHERE user_id = ? AND status = 'present'", [userId]);
        const presentCount = presentResult.length ? presentResult[0].values[0][0] : 0;

        // Late count
        const lateResult = queryAll("SELECT COUNT(*) FROM attendance WHERE user_id = ? AND status = 'late'", [userId]);
        const lateCount = lateResult.length ? lateResult[0].values[0][0] : 0;

        // Total classes available (for the user's programme/section)
        let totalClasses = 0;
        if (req.user.programme && req.user.section) {
            const classResult = queryAll(
                'SELECT COUNT(*) FROM classes WHERE programme = ? AND section = ?',
                [req.user.programme, req.user.section]
            );
            totalClasses = classResult.length ? classResult[0].values[0][0] : 0;
        }

        // Attendance percentage
        const percentage = totalAttended > 0 ? Math.round((presentCount / totalAttended) * 100) : 0;

        // Streak — consecutive days with attendance
        let streak = 0;
        const streakResult = queryAll(
            `SELECT DISTINCT date FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 30`,
            [userId]
        );
        if (streakResult.length && streakResult[0].values.length) {
            const dates = streakResult[0].values.map(r => r[0]);
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
        const recentResult = queryAll(
            `SELECT a.date, a.status, a.marked_at, c.code, c.name
       FROM attendance a LEFT JOIN classes c ON a.class_id = c.id
       WHERE a.user_id = ? ORDER BY a.marked_at DESC LIMIT 5`,
            [userId]
        );
        const recent = [];
        if (recentResult.length && recentResult[0].values.length) {
            for (const row of recentResult[0].values) {
                recent.push({ date: row[0], status: row[1], marked_at: row[2], class_code: row[3], class_name: row[4] });
            }
        }

        // Today's attendance count
        const today = new Date().toISOString().split('T')[0];
        const todayResult = queryAll('SELECT COUNT(*) FROM attendance WHERE user_id = ? AND date = ?', [userId, today]);
        const todayCount = todayResult.length ? todayResult[0].values[0][0] : 0;

        res.json({
            total_attended: totalAttended,
            present_count: presentCount,
            late_count: lateCount,
            total_classes: totalClasses,
            percentage,
            streak,
            today_count: todayCount,
            recent
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
};

module.exports = {
    getDashboardStats
};
