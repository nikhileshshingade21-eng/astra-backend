const axios = require('axios');

const AI_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';
// SEC-011 FIX: Add timeout to prevent hanging requests
const AI_TIMEOUT = 10000; // 10 seconds

const getPredictedMarks = async (studentId, historicalMarks, recentAttendance) => {
    try {
        const response = await axios.post(`${AI_URL}/api/predict/marks`, {
            student_id: studentId,
            historical_marks: historicalMarks,
            recent_attendance: recentAttendance
        }, { timeout: AI_TIMEOUT });
        return response.data;
    } catch (error) {
        console.error("AI Marks Prediction Error:", error.message);
        return { error: 'Failed to predict marks' };
    }
};

const getAttendanceDrift = async (studentId, historicalMarks, recentAttendance) => {
    try {
        const response = await axios.post(`${AI_URL}/api/analyze/drift`, {
            student_id: studentId,
            historical_marks: historicalMarks, // Not strictly used by drift but required by schema
            recent_attendance: recentAttendance
        }, { timeout: AI_TIMEOUT });
        return response.data;
    } catch (error) {
        console.error("AI Attendance Drift Error:", error.message);
        return { error: 'Failed to analyze drift' };
    }
};



const chat = async (studentId, message) => {
    // 🛡️ ASTRA V3: Built-in Student Assistant (no external Python dependency)
    // This runs directly inside the Node.js backend on Railway
    const msg = message.toLowerCase();
    let response = '';
    let metadata = { sentiment: 'Neutral', topic: 'General' };

    try {
        const { queryAll } = require('../database_module');

        if (msg.includes('class') || msg.includes('schedule') || msg.includes('timetable') || msg.includes('today')) {
            // Fetch REAL classes for this student
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];
            const user = await queryAll('SELECT programme, section FROM users WHERE id = $1', [studentId]);
            if (user.length > 0) {
                const classes = await queryAll(
                    'SELECT name, start_time, end_time, room FROM classes WHERE programme = $1 AND section = $2 AND day = $3 ORDER BY start_time',
                    [user[0].programme, user[0].section, today]
                );
                if (classes.length === 0) {
                    response = `No classes scheduled for you today (${today}). Enjoy your free day! 🎉`;
                } else {
                    const list = classes.map((c, i) => `${i + 1}. ${c.name} at ${c.start_time} in ${c.room || 'TBA'}`).join('\n');
                    response = `You have ${classes.length} class(es) today (${today}):\n${list}`;
                }
            } else {
                response = `I couldn't find your profile. Please make sure you're registered in ASTRA.`;
            }
            metadata.topic = 'Schedule';

        } else if (msg.includes('attendance') || msg.includes('bunk') || msg.includes('skip') || msg.includes('absent')) {
            const att = await queryAll(
                `SELECT COUNT(*) as total, COUNT(CASE WHEN status IN ('present','late') THEN 1 END) as attended FROM attendance WHERE user_id = $1`,
                [studentId]
            );
            const total = parseInt(att[0]?.total) || 0;
            const attended = parseInt(att[0]?.attended) || 0;
            const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
            if (total === 0) {
                response = `No attendance records found yet. Start marking attendance to track your progress! 📊`;
            } else {
                const safe = Math.max(0, Math.floor(attended / 0.75 - total));
                response = `Your attendance: ${attended}/${total} classes (${pct}%). ${pct >= 75 ? `You're safe! You can skip ${safe} more classes. ✅` : `⚠️ You're below 75%. Attend more classes!`}`;
            }
            metadata.topic = 'Attendance';

        } else if (msg.includes('mark') || msg.includes('grade') || msg.includes('sgpa') || msg.includes('cgpa') || msg.includes('result')) {
            response = `Check your marks and predicted SGPA on the Marks screen in ASTRA. Your AI prediction engine analyzes trends based on your attendance and past performance. 📈`;
            metadata.topic = 'Academics';

        } else if (msg.includes('holiday') || msg.includes('calendar') || msg.includes('vacation') || msg.includes('exam')) {
            const events = await queryAll(
                `SELECT title, start_date, end_date, event_type FROM academic_calendar WHERE start_date >= CURRENT_DATE ORDER BY start_date LIMIT 5`
            );
            if (events.length > 0) {
                const list = events.map(e => `• ${e.title} (${e.event_type}) — ${e.start_date}`).join('\n');
                response = `Upcoming events:\n${list}`;
            } else {
                response = `No upcoming events found in the academic calendar.`;
            }
            metadata.topic = 'Calendar';

        } else if (msg.includes('hello') || msg.includes('hey') || msg.includes('hi')) {
            response = `Hello! 👋 I'm ASTRA AI, your campus assistant. Ask me about your classes, attendance, marks, or holidays!`;

        } else if (msg.includes('thank')) {
            response = `You're welcome! Happy to help. 😊`;

        } else {
            response = `I can help you with:\n• Your today's classes & schedule\n• Attendance percentage & safe bunks\n• Marks & SGPA predictions\n• Academic calendar & holidays\n\nTry asking "What classes do I have today?" or "What's my attendance?"`;
        }
    } catch (dbErr) {
        console.error('AI Chat DB Error:', dbErr.message);
        response = `I'm having trouble accessing your data right now. Please try again in a moment.`;
    }

    return {
        user_id: studentId,
        response,
        confidence: 0.95,
        source: 'ASTRA_Native_Assistant',
        metadata
    };
};

const matchJobs = async (studentId, studentCgpa, jobsList) => {
    try {
        const response = await axios.post(`${AI_URL}/api/jobs/match`, {
            student_id: studentId,
            cgpa: parseFloat(studentCgpa),
            available_jobs: jobsList
        }, { timeout: 15000 });
        return response.data.matches;
    } catch (error) {
        console.error('AI Job Matching Error:', error.message);
        // Fallback: simple numeric filtering
        return jobsList.filter(j => studentCgpa >= j.min_cgpa).map(j => ({ ...j, match_confidence: 0.5 }));
    }
};

module.exports = {
    AI_URL,
    getAttendanceDrift,
    chat,
    matchJobs
};
