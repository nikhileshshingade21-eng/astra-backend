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



const { GoogleGenerativeAI } = require('@google/generative-ai');

// Trim added to strip invisible spaces that accidentally get copied!
const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || '').trim());
const chat = async (studentId, message) => {
    let metadata = { sentiment: 'Neutral', topic: 'General' };

    try {
        const { queryAll } = require('../database_module');
        let contextArray = [];

        // 1. Fetch Schedule Context
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        const today = days[istTime.getUTCDay()];
        
        const user = await queryAll('SELECT programme, section FROM users WHERE id = $1', [studentId]);
        if (user.length > 0) {
            const classes = await queryAll(
                'SELECT name, start_time, end_time, room FROM classes WHERE programme = $1 AND section = $2 AND day = $3 ORDER BY start_time',
                [user[0].programme, user[0].section, today]
            );
            if (classes.length > 0) {
                const list = classes.map(c => `${c.name} at ${c.start_time} in ${c.room || 'TBA'}`).join(', ');
                contextArray.push(`Today is ${today}. The student has ${classes.length} classes today: ${list}.`);
            } else {
                contextArray.push(`Today is ${today}. The student has NO classes scheduled today.`);
            }
        }

        // 2. Fetch Attendance Context
        const att = await queryAll(
            `SELECT COUNT(*) as total, COUNT(CASE WHEN status IN ('present','late') THEN 1 END) as attended FROM attendance WHERE user_id = $1`,
            [studentId]
        );
        const total = parseInt(att[0]?.total) || 0;
        const attended = parseInt(att[0]?.attended) || 0;
        const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
        if (total > 0) {
            const safe = Math.max(0, Math.floor(attended / 0.75 - total));
            contextArray.push(`The student's current attendance is ${Math.round(pct)}% (${attended}/${total} classes). They can safely skip ${safe} classes without falling below 75%.`);
        } else {
            contextArray.push(`The student has no attendance records logged yet.`);
        }

        // 3. Fetch Calendar Context
        const events = await queryAll(
            `SELECT title, start_date, event_type FROM academic_calendar WHERE start_date >= CURRENT_DATE ORDER BY start_date LIMIT 3`
        );
        if (events.length > 0) {
            const list = events.map(e => `${e.title} (${e.start_date})`).join(', ');
            contextArray.push(`Upcoming campus events/holidays: ${list}.`);
        }

        const contextString = contextArray.join('\n');

        console.log(`[ASTRA AI] Dispatching to Gemini 1.5 Flash with context:`, contextString);

        // 4. Call Google Gemini API
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "You are ASTRA AI, a smart and helpful assistant inside a student app.\nGive clear, accurate, and simple answers.\nIf student data is provided in the context, use it to give precise personalized responses.\nIf they ask about their attendance, schedule, or holidays, ONLY refer to the student context provided.\nOtherwise behave like a typical AI assistant answering general knowledge or academic questions.\nDo not make up data. Keep responses short and friendly."
        });

        const prompt = `[STUDENT CONTEXT (Live DB Data)]\n${contextString}\n\n[USER MESSAGE]\n${message}`;

        const aiResponse = await model.generateContent(prompt);
        const responseText = aiResponse.response.text();

        return {
            user_id: studentId,
            response: responseText,
            confidence: 0.99,
            source: 'Gemini_ASTRA_Engine',
            metadata
        };

    } catch (err) {
        console.error('Gemini Chat Error Details:', err);
        return {
            user_id: studentId,
            response: `I'm having trouble connecting to my Google AI core (Gemini).\nError: ${err.message || 'API Key Invalid'}\nMake sure my GEMINI_API_KEY is active!`,
            confidence: 0,
            source: 'ASTRA_Fallback',
            metadata
        };
    }
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
