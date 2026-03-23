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

const verifyFace = async (targetBase64, imageBase64) => {
    try {
        const response = await axios.post(`${AI_URL}/api/face/verify`, {
            target_base64: targetBase64,
            image_base64: imageBase64
        }, { timeout: AI_TIMEOUT });
        return response.data;
    } catch (error) {
        console.error("AI Face Verify Error:", error.message);
        throw new Error('AI Engine unreachable');
    }
};

const chat = async (studentId, message) => {
    try {
        const response = await axios.post(`${AI_URL}/api/chat`, {
            user_id: studentId,
            message: message
        }, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error('AI Chat Error:', error.message);
        // Graceful fallback if AI is down
        return {
            response: "I'm sorry, the Campus AI Assistant is currently offline. Please check the website for general information.",
            confidence: 0
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
    getPredictedMarks,
    getAttendanceDrift,
    verifyFace,
    chat,
    matchJobs
};
