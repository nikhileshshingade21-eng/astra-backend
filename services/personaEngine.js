/**
 * ASTRA V4 Persona Engine
 * ========================
 * The intelligence core of ASTRA's predictive behavior system.
 *
 * Responsibilities:
 * 1. Risk Persona Classification (Scholar / Phantom / Neutral)
 * 2. Habit Matrix Updates (hourly heatmaps)
 * 3. Predictive Grace Period Calculation
 * 4. Sentient Notification Copy Generation
 * 5. Dual-write shadow predictions for accuracy training
 */

const { queryAll } = require('../database_module');

// ─── PERSONA DEFINITIONS ────────────────────────────────────────────────────

const PERSONAS = {
    the_scholar: {
        label: 'The Scholar',
        grace_period_minutes: 120,  // 2 hours — highly trusted
        risk_score_range: [0, 25],
        description: 'High attendance, consistent daily usage'
    },
    neutral: {
        label: 'Neutral',
        grace_period_minutes: 30,   // 30 minutes — default
        risk_score_range: [26, 65],
        description: 'Average engagement patterns'
    },
    the_phantom: {
        label: 'The Phantom',
        grace_period_minutes: 10,   // 10 minutes — strict monitoring
        risk_score_range: [66, 100],
        description: 'Serial bunks, highly erratic patterns'
    }
};

// ─── SENTIENT NOTIFICATION COPY ─────────────────────────────────────────────

const SENTIENT_COPY = {
    overdue_return: {
        the_scholar: [
            { title: '📚 Taking a longer break today?', body: "You usually check in way more often. Hope everything's fine — your consistency is what makes you legendary." },
            { title: '🎓 The Scholar is quiet...', body: "I know you've got this, but just checking in. Your streak is too good to let slip." },
        ],
        neutral: [
            { title: '👋 Hey, been a while', body: "Haven't seen you in a bit. Your classes might be missing your face — or at least your attendance." },
            { title: '📱 Quick check-in', body: "Just making sure you haven't forgotten about us. Your schedule's waiting!" },
        ],
        the_phantom: [
            { title: '👻 The Phantom strikes again', body: "I see you're doing your disappearing act. Your attendance could really use your actual presence right now." },
            { title: '🚨 ASTRA needs you here', body: "Your pattern says you ghost around this time. Break the cycle — just one class today?" },
        ]
    },
    morning_nudge: {
        the_scholar: [
            { title: '☀️ Good morning, Champion', body: "Your streak is still alive! {classCount} classes today starting at {firstClass}. Keep being amazing." },
        ],
        neutral: [
            { title: '☀️ New day, new chance', body: "You've got {classCount} classes today. First at {firstClass}. Let's make it count!" },
        ],
        the_phantom: [
            { title: '⏰ Morning! Let\'s turn it around', body: "I've noticed mornings are tough lately. Your {firstClass} class is important — can I count on you today?" },
            { title: '🌅 Hey, early bird gets the attendance', body: "Your 8AM streak is slipping. {classCount} classes today — just show up. That's all it takes." },
        ]
    },
    streak_risk: {
        the_scholar: [
            { title: '🏆 Protect your legacy', body: "Your {streak}-day streak is one of the longest in your batch. Don't let it end today!" },
        ],
        neutral: [
            { title: '🔥 Keep it going!', body: "You're on a {streak}-day streak. That's actually impressive — don't break it now!" },
        ],
        the_phantom: [
            { title: '💪 A streak? From YOU?', body: "{streak} days! That's honestly amazing progress. Every day you show up, the old pattern breaks more." },
        ]
    },
    inactivity: {
        the_scholar: [
            { title: '🤔 Everything okay?', body: "It's not like you to go quiet for {days} days. If something's up, we're here. Your classes miss you." },
        ],
        neutral: [
            { title: '📢 We miss you', body: "{days} days without checking in. Your attendance is waiting — just a quick tap away." },
        ],
        the_phantom: [
            { title: '👻 Phantom Mode: {days} days', body: "I know this is your thing, but {days} days is a lot even for you. One class. That's all I'm asking." },
        ]
    }
};

// ─── PERSONA CLASSIFICATION ─────────────────────────────────────────────────

/**
 * Classifies a user into a risk persona based on their attendance data.
 * Updates the users table with the new persona and associated grace period.
 *
 * @param {number} userId
 * @returns {object} { persona, risk_score, grace_period_minutes }
 */
async function classifyUserPersona(userId) {
    try {
        // Get attendance stats
        const stats = await queryAll(`
            SELECT 
                COUNT(*) as total_classes,
                COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as attended,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as missed
            FROM attendance 
            WHERE user_id = $1
        `, [userId]);

        const total = parseInt(stats[0]?.total_classes) || 0;
        const attended = parseInt(stats[0]?.attended) || 0;

        // Not enough data — keep as neutral
        if (total < 5) {
            return { persona: 'neutral', risk_score: 50, grace_period_minutes: 30 };
        }

        const attendanceRate = (attended / total) * 100;

        // Get recent login consistency (last 14 days)
        const recentActivity = await queryAll(`
            SELECT COUNT(DISTINCT DATE(created_at)) as active_days
            FROM user_behavior_logs
            WHERE user_id = $1 AND created_at > NOW() - INTERVAL '14 days'
        `, [userId]);

        const activeDays = parseInt(recentActivity[0]?.active_days) || 0;
        const consistencyRate = (activeDays / 14) * 100;

        // Calculate risk score (0 = safe, 100 = high risk)
        let riskScore = 100 - ((attendanceRate * 0.6) + (consistencyRate * 0.4));
        riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

        // Classify persona
        let persona = 'neutral';
        let gracePeriod = PERSONAS.neutral.grace_period_minutes;

        if (riskScore <= 25 && attendanceRate >= 85) {
            persona = 'the_scholar';
            gracePeriod = PERSONAS.the_scholar.grace_period_minutes;
        } else if (riskScore >= 66 || attendanceRate < 60) {
            persona = 'the_phantom';
            gracePeriod = PERSONAS.the_phantom.grace_period_minutes;
        }

        // Update user record
        await queryAll(`
            UPDATE users 
            SET risk_persona = $1, risk_score = $2, grace_period_minutes = $3
            WHERE id = $4
        `, [persona, riskScore, gracePeriod, userId]);

        console.log(`[PERSONA] User ${userId} → ${persona} (risk: ${riskScore}, grace: ${gracePeriod}min)`);

        return { persona, risk_score: riskScore, grace_period_minutes: gracePeriod };
    } catch (err) {
        console.error(`[PERSONA] Classification failed for user ${userId}:`, err.message);
        return { persona: 'neutral', risk_score: 50, grace_period_minutes: 30 };
    }
}

// ─── HABIT MATRIX ───────────────────────────────────────────────────────────

/**
 * Records an activity event in the user's habit matrix.
 * Builds hourly usage heatmaps per user over time.
 */
async function updateHabitMatrix(userId, durationMins = 1) {
    try {
        const now = new Date();
        // Convert to IST for accurate hour bucketing
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        const hourBucket = istTime.getUTCHours();
        const dayOfWeek = istTime.getUTCDay();

        await queryAll(`
            INSERT INTO user_habit_matrix (user_id, hour_bucket, day_of_week, activity_count, avg_duration_mins, last_updated)
            VALUES ($1, $2, $3, 1, $4, NOW())
            ON CONFLICT (user_id, hour_bucket, day_of_week) 
            DO UPDATE SET 
                activity_count = user_habit_matrix.activity_count + 1,
                avg_duration_mins = (user_habit_matrix.avg_duration_mins * user_habit_matrix.activity_count + $4) / (user_habit_matrix.activity_count + 1),
                last_updated = NOW()
        `, [userId, hourBucket, dayOfWeek, durationMins]);

    } catch (err) {
        console.error(`[HABIT] Matrix update failed for user ${userId}:`, err.message);
    }
}

/**
 * Gets the user's peak activity hours (top 3 most active hours).
 */
async function getUserPeakHours(userId) {
    try {
        const rows = await queryAll(`
            SELECT hour_bucket, SUM(activity_count) as total_activity
            FROM user_habit_matrix
            WHERE user_id = $1
            GROUP BY hour_bucket
            ORDER BY total_activity DESC
            LIMIT 3
        `, [userId]);

        return rows.map(r => parseInt(r.hour_bucket));
    } catch (err) {
        return [];
    }
}

// ─── PREDICTIVE GRACE PERIOD ────────────────────────────────────────────────

/**
 * Calculates the expected_return timestamp for a user based on their persona
 * and usage patterns. Stores in users.expected_return.
 *
 * @param {number} userId
 * @param {string} eventType — the event that triggered this calculation
 * @returns {Date} the predicted return time
 */
async function calculateExpectedReturn(userId, eventType = 'APP_BACKGROUNDED') {
    try {
        // Get user's current persona and grace period
        const userRows = await queryAll(
            'SELECT risk_persona, grace_period_minutes FROM users WHERE id = $1',
            [userId]
        );

        if (userRows.length === 0) return null;

        const user = userRows[0];
        const graceMins = user.grace_period_minutes || PERSONAS.neutral.grace_period_minutes;

        // Calculate expected return
        const expectedReturn = new Date(Date.now() + (graceMins * 60 * 1000));

        // Update user record
        await queryAll(
            'UPDATE users SET expected_return = $1, last_active_at = NOW() WHERE id = $2',
            [expectedReturn.toISOString(), userId]
        );

        // Dual-write shadow: record prediction for accuracy training
        await queryAll(`
            INSERT INTO event_predictions (user_id, event_type, predicted_at, created_at)
            VALUES ($1, $2, $3, NOW())
        `, [userId, eventType, expectedReturn.toISOString()]);

        return expectedReturn;
    } catch (err) {
        console.error(`[PREDICT] Failed for user ${userId}:`, err.message);
        return null;
    }
}

/**
 * Records when a user actually returned — updates the shadow prediction
 * to calculate accuracy for future algorithm tuning.
 */
async function recordActualReturn(userId, eventType = 'APP_RESUMED') {
    try {
        // Find the most recent prediction for this user
        await queryAll(`
            UPDATE event_predictions 
            SET actual_at = NOW(),
                accuracy_delta_mins = EXTRACT(EPOCH FROM (NOW() - predicted_at)) / 60.0
            WHERE id = (
                SELECT id FROM event_predictions 
                WHERE user_id = $1 AND actual_at IS NULL 
                ORDER BY created_at DESC LIMIT 1
            )
        `, [userId]);

        // Update user online status
        await queryAll(
            'UPDATE users SET last_active_at = NOW(), expected_return = NULL WHERE id = $1',
            [userId]
        );
    } catch (err) {
        console.error(`[PREDICT] Actual return recording failed for user ${userId}:`, err.message);
    }
}

// ─── SENTIENT COPY GENERATOR ────────────────────────────────────────────────

/**
 * Generates personality-aware notification copy based on user's persona.
 *
 * @param {string} copyType — key from SENTIENT_COPY (e.g., 'overdue_return')
 * @param {string} persona — 'the_scholar', 'neutral', 'the_phantom'
 * @param {object} vars — template variables to substitute
 * @returns {{ title: string, body: string } | null}
 */
function getSentientCopy(copyType, persona = 'neutral', vars = {}) {
    const templates = SENTIENT_COPY[copyType]?.[persona];
    if (!templates || templates.length === 0) {
        // Fallback to neutral copy
        const fallback = SENTIENT_COPY[copyType]?.neutral;
        if (!fallback || fallback.length === 0) return null;
        return applyVars(fallback[Math.floor(Math.random() * fallback.length)], vars);
    }

    const template = templates[Math.floor(Math.random() * templates.length)];
    return applyVars(template, vars);
}

function applyVars(template, vars) {
    let title = template.title;
    let body = template.body;
    for (const [key, value] of Object.entries(vars)) {
        title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    return { title, body };
}

// ─── BATCH RECLASSIFICATION ─────────────────────────────────────────────────

/**
 * Reclassifies all active students. Run periodically (e.g., nightly).
 */
async function reclassifyAllPersonas() {
    try {
        const students = await queryAll("SELECT id FROM users WHERE role = 'student'");
        let updated = 0;

        for (const student of students) {
            await classifyUserPersona(student.id);
            updated++;
        }

        console.log(`[PERSONA] Reclassified ${updated} students.`);
        return updated;
    } catch (err) {
        console.error('[PERSONA] Batch reclassification failed:', err.message);
        return 0;
    }
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────

module.exports = {
    PERSONAS,
    classifyUserPersona,
    updateHabitMatrix,
    getUserPeakHours,
    calculateExpectedReturn,
    recordActualReturn,
    getSentientCopy,
    reclassifyAllPersonas,
    SENTIENT_COPY,
};
