const aiService = require('../services/aiService');
const { getDb, queryAll } = require('../db');

const getAiReport = async (req, res) => {
    try {
         const { rollNumber } = req.params;
         const db = await getDb();
         
         // In a real app, historical marks would come from a marks table
         // For demo, we mock historical marks
         const historicalMarks = [75, 82, 78, 85, 80];
         
         const userRes = queryAll('SELECT id FROM users WHERE roll_number = ?', [rollNumber.toUpperCase()]);
         if (!userRes.length || !userRes[0].values.length) {
              return res.status(404).json({ error: 'Student not found' });
         }
         
         const userId = userRes[0].values[0][0];
         
         // Fetch recent attendance as a percentage per day (1 = present, 0 = absent)
         const attRes = queryAll(`SELECT status FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 10`, [userId]);
         
         const recentAttendance = [];
         if (attRes.length && attRes[0].values.length) {
             for(const row of attRes[0].values) {
                 recentAttendance.push(row[0] === 'present' ? 1.0 : 0.0);
             }
         } else {
             // Mock some attendance if no real records exist
             recentAttendance.push(...[1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0]);
         }
         
         // Parallel requests to AI engine
         const [prediction, drift] = await Promise.all([
             aiService.getPredictedMarks(userId, historicalMarks, recentAttendance),
             aiService.getAttendanceDrift(userId, historicalMarks, recentAttendance)
         ]);
         
         res.json({
             student_id: userId,
             roll_number: rollNumber,
             prediction,
             drift
         });
         
    } catch (err) {
        console.error("AI Controller Error:", err);
        res.status(500).json({ error: "Failed to generate AI report" })
    }
}

const verifyIdentity = async (req, res) => {
    try {
        const { rollNumber, imageBase64 } = req.body;
        const db = await getDb();

        // 1. Fetch the encrypted target vector from DB
        const userRes = queryAll('SELECT biometric_template FROM users WHERE roll_number = ?', [rollNumber.toUpperCase()]);
        
        if (!userRes.length || !userRes[0].values.length) {
            return res.status(404).json({ error: 'Student not found or not enrolled' });
        }

        const encryptedTemplate = userRes[0].values[0][0];
        if (!encryptedTemplate) {
            return res.status(400).json({ error: 'Biometric template not found. Please register first.' });
        }

        // 2. Decrypt the template
        const { decrypt } = require('../utils/encryption');
        const decryptedStr = decrypt(encryptedTemplate);
        const templateObj = JSON.parse(decryptedStr);
        const targetVector = templateObj.data; // The 128-d vector

        // 3. Call AI Engine for deep verification
        const result = await aiService.verifyFace(targetVector, imageBase64);

        res.json(result);

    } catch (err) {
        console.error("Identity Verification Error:", err);
        res.status(500).json({ error: "Face verification failed" });
    }
};

module.exports = {
    getAiReport,
    verifyIdentity
};
