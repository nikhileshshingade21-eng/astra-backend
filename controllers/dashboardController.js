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

        // --- NEW: ASTRA V2 AGGREGATION & AI RISK SCORING ---
        let predictedMarks = null;
        let driftAnalysis = null;
        try {
            // Mock historical marks for now or fetch from DB if available
            const historicalMarks = [75, 82, 78, 85, 80];
            const recentAttArray = percentage > 0 ? [percentage/100, percentage/100, percentage/100] : [0,0,0];
            
            const [prediction, drift] = await Promise.all([
                aiService.getPredictedMarks(userId, historicalMarks, recentAttArray),
                aiService.getAttendanceDrift(userId, historicalMarks, recentAttArray)
            ]);
            predictedMarks = prediction;
            driftAnalysis = drift;
        } catch (e) {
            console.error('Failed to aggregate AI stats for dashboard:', e);
        }

        res.json({
            total_attended: totalAttended,
            present_count: presentCount,
            late_count: lateCount,
            total_classes: totalClasses,
            percentage,
            streak,
            today_count: todayCount,
            recent,
            // ASTRA V2 Metrics
            predictive_insights: {
                predicted_marks: predictedMarks,
                drift_analysis: driftAnalysis
            }
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
};

module.exports = {
    getDashboardStats
};
