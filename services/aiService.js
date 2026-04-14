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



// 🌐 ASTRA V3: Internet-powered search for general knowledge questions
async function searchWeb(query) {
    try {
        // Try Wikipedia first — best for "What is X?" questions
        const wikiSearch = query.replace(/^(what is|what are|who is|who was|explain|define|tell me about)\s+/i, '').trim();
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiSearch)}`;
        const wikiRes = await axios.get(wikiUrl, { timeout: 5000 });
        if (wikiRes.data && wikiRes.data.extract && wikiRes.data.extract.length > 50) {
            return {
                answer: wikiRes.data.extract,
                source: `Wikipedia: ${wikiRes.data.title}`,
                url: wikiRes.data.content_urls?.desktop?.page || ''
            };
        }
    } catch (e) { /* Wikipedia miss, try DuckDuckGo */ }

    try {
        // DuckDuckGo Instant Answer API (completely free, no API key)
        const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const ddgRes = await axios.get(ddgUrl, { timeout: 5000 });
        const data = ddgRes.data;
        
        if (data.AbstractText && data.AbstractText.length > 30) {
            return {
                answer: data.AbstractText,
                source: data.AbstractSource || 'DuckDuckGo',
                url: data.AbstractURL || ''
            };
        }
        
        // Check if there's a related topic answer
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            const top = data.RelatedTopics.slice(0, 3)
                .filter(t => t.Text)
                .map(t => `• ${t.Text}`)
                .join('\n');
            if (top.length > 20) {
                return {
                    answer: `Here's what I found:\n${top}`,
                    source: 'DuckDuckGo',
                    url: ''
                };
            }
        }
    } catch (e) { /* DuckDuckGo miss too */ }

    return null;
}

// Fuzzy keyword checker — tolerates common typos
function matchesAny(text, keywords) {
    for (const kw of keywords) {
        if (text.includes(kw)) return true;
        // Simple typo tolerance: check if any 2+ char subsequence matches
        for (let i = 0; i <= text.length - kw.length + 1; i++) {
            const slice = text.substring(i, i + kw.length);
            let diff = 0;
            for (let j = 0; j < kw.length; j++) {
                if (slice[j] !== kw[j]) diff++;
            }
            if (diff <= 1 && kw.length >= 4) return true; // Allow 1 typo for words 4+ chars
        }
    }
    return false;
}

const chat = async (studentId, message) => {
    // 🛡️ ASTRA V3: Built-in Student Assistant with Internet Access
    const msg = message.toLowerCase().trim();
    let response = '';
    let metadata = { sentiment: 'Neutral', topic: 'General' };

    try {
        const { queryAll } = require('../database_module');

        // --- CAMPUS-SPECIFIC QUERIES (Database-powered) ---
        if (matchesAny(msg, ['class', 'schedule', 'timetable', 'lecture', 'period'])) {
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
                if (classes.length === 0) {
                    response = `No classes scheduled for you today (${today}). Enjoy your free day! 🎉`;
                } else {
                    const list = classes.map((c, i) => `${i + 1}. ${c.name} at ${c.start_time} in ${c.room || 'TBA'}`).join('\n');
                    response = `📚 You have ${classes.length} class(es) today (${today}):\n${list}`;
                }
            } else {
                response = `I couldn't find your profile. Please make sure you're registered in ASTRA.`;
            }
            metadata.topic = 'Schedule';

        } else if (matchesAny(msg, ['attendance', 'attandance', 'attendence', 'bunk', 'skip', 'absent', 'present'])) {
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
                response = `📊 Your attendance: ${attended}/${total} classes (${pct}%).\n${pct >= 75 ? `✅ You're safe! You can skip ${safe} more classes.` : `⚠️ You're below 75%. Attend more classes!`}`;
            }
            metadata.topic = 'Attendance';

        } else if (matchesAny(msg, ['mark', 'grade', 'sgpa', 'cgpa', 'result', 'score'])) {
            response = `📈 Check your marks and predicted SGPA on the Marks screen in ASTRA. Your AI prediction engine analyzes trends based on your attendance and past performance.`;
            metadata.topic = 'Academics';

        } else if (matchesAny(msg, ['holiday', 'calendar', 'vacation', 'exam', 'festival', 'break'])) {
            const events = await queryAll(
                `SELECT title, start_date, end_date, event_type FROM academic_calendar WHERE start_date >= CURRENT_DATE ORDER BY start_date LIMIT 5`
            );
            if (events.length > 0) {
                const list = events.map(e => `• ${e.title} (${e.event_type}) — ${e.start_date}`).join('\n');
                response = `📅 Upcoming events:\n${list}`;
            } else {
                response = `No upcoming events found in the academic calendar.`;
            }
            metadata.topic = 'Calendar';

        } else if (matchesAny(msg, ['hello', 'hey', 'hi ', 'hii', 'helo', 'sup'])) {
            response = `Hello! 👋 I'm ASTRA AI, your campus assistant.\n\nI can help with:\n• Classes & schedule\n• Attendance & safe bunks\n• Marks & predictions\n• Academic calendar\n• General knowledge (I can search the internet! 🌐)`;

        } else if (matchesAny(msg, ['thank', 'thx', 'thnk'])) {
            response = `You're welcome! Happy to help. 😊`;

        } else {
            // --- GENERAL KNOWLEDGE: Search the Internet! 🌐 ---
            metadata.topic = 'General Knowledge';
            console.log(`[ASTRA AI] Searching internet for: "${message}"`);
            
            const webResult = await searchWeb(message);
            
            if (webResult) {
                response = `🌐 ${webResult.answer}`;
                if (webResult.source) {
                    response += `\n\n📖 Source: ${webResult.source}`;
                }
                metadata.sentiment = 'Informative';
            } else {
                response = `I searched the web but couldn't find a clear answer for "${message}".\n\nHowever, I can definitely help you with:\n• "What classes do I have today?"\n• "What's my attendance?"\n• "Any upcoming holidays?"\n• Or try asking a general question like "What is machine learning?"`;
            }
        }
    } catch (dbErr) {
        console.error('AI Chat Error:', dbErr.message);
        response = `I'm having trouble right now. Please try again in a moment.`;
    }

    return {
        user_id: studentId,
        response,
        confidence: 0.95,
        source: 'ASTRA_Smart_Assistant',
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
