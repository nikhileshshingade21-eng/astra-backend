const axios = require('axios');

const AI_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

const getPredictedMarks = async (studentId, historicalMarks, recentAttendance) => {
    try {
        const response = await axios.post(`${AI_URL}/api/predict/marks`, {
            student_id: studentId,
            historical_marks: historicalMarks,
            recent_attendance: recentAttendance
        });
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
        });
        return response.data;
    } catch (error) {
        console.error("AI Attendance Drift Error:", error.message);
        return { error: 'Failed to analyze drift' };
    }
};

const verifyFace = async (targetVector, imageBase64) => {
    try {
        const response = await axios.post(`${AI_URL}/api/face/verify`, {
            target_vector: targetVector,
            image_base64: imageBase64
        });
        return response.data;
    } catch (error) {
        console.error("AI Face Verify Error:", error.message);
        throw new Error('AI Engine unreachable');
    }
};

module.exports = {
    getPredictedMarks,
    getAttendanceDrift,
    verifyFace
};
