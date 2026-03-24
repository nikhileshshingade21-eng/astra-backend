const aiService = require('../services/aiService');
const { getDb, queryAll, saveDb } = require('../database_module.js');
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const getAiReport = async (req, res) => {
    try {
         const { rollNumber } = req.params;
         const db = await getDb();
         
         // In a real app, historical marks would come from a marks table
         // For demo, we mock historical marks
         const historicalMarks = [75, 82, 78, 85, 80];
         
         const userRes = await queryAll('SELECT id FROM users WHERE roll_number = $1', [rollNumber.toUpperCase()]);
         if (userRes.length === 0) {
              return res.status(404).json({ error: 'Student not found' });
         }
         
         const userId = userRes[0].id;
         
         // Fetch recent attendance as a percentage per day (1 = present, 0 = absent)
         const attRes = await queryAll(`SELECT status FROM attendance WHERE user_id = $1 ORDER BY date DESC LIMIT 10`, [userId]);
         
         const recentAttendance = [];
         if (attRes.length > 0) {
             for(const row of attRes) {
                 recentAttendance.push(row.status === 'present' ? 1.0 : 0.0);
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

        // Input validation
        if (!rollNumber || typeof rollNumber !== 'string') {
            return res.status(400).json({ verified: false, error: 'Roll number is required' });
        }
        if (!imageBase64 || typeof imageBase64 !== 'string') {
            return res.status(400).json({ verified: false, error: 'Image data is required' });
        }
        // SEC-012 FIX: Limit base64 payload size (5MB max)
        if (imageBase64.length > 5 * 1024 * 1024) {
            return res.status(400).json({ verified: false, error: 'Image data too large (max 5MB)' });
        }

        const db = await getDb();

        // 1. Fetch the encrypted target vector from DB
        const userRes = await queryAll('SELECT biometric_template FROM users WHERE roll_number = $1', [rollNumber.toUpperCase()]);
        
        if (userRes.length === 0) {
            return res.status(404).json({ error: 'Student not found or not enrolled' });
        }

        const encryptedTemplate = userRes[0].biometric_template;
        if (!encryptedTemplate) {
            return res.status(400).json({ error: 'Biometric template not found. Please register first.' });
        }

        // 2. Decrypt the template
        const { decrypt } = require('../utils/encryption');
        const decryptedStr = decrypt(encryptedTemplate);
        const templateObj = JSON.parse(decryptedStr);
        const targetBase64 = templateObj.data; // The registered base64 string

        // 3. Call AI Engine for deep verification
        try {
            const result = await aiService.verifyFace(targetBase64, imageBase64);
            res.json(result);
        } catch (aiErr) {
            // SEC-001 FIX: AI Engine unreachable — DENY verification (never auto-pass)
            console.warn("AI Engine unreachable:", aiErr.message);
            res.status(503).json({ verified: false, confidence: 0, method: 'denied', message: 'AI Engine unavailable. Verification cannot proceed. Try again later.' });
        }

    } catch (err) {
        // SEC-001 FIX: Any error — DENY verification (never auto-pass)
        console.error("Identity Verification Error:", err.message);
        res.status(500).json({ verified: false, confidence: 0, method: 'error', message: 'Verification failed. Please contact admin.' });
    }
};

const chat = async (req, res) => {
    // HIGH-04 FIX: Don't log user message content
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // ASTRA V3: Real-time status update
        const socketService = require('../services/socketService');
        socketService.emitToUser(req.user.id, 'ai_status', { status: '🤔 Thinking...', thought: 'Orchestrating V3 agents...' });

        const response = await aiService.chat(req.user.id, message);
        
        socketService.emitToUser(req.user.id, 'ai_status', { status: '✅ Done', thought: 'Finalizing response' });
        
        // --- NEW: LOG FOR ANALYTICS ---
        try {
            await queryAll(
                'INSERT INTO ai_conversations (user_id, query, response, sentiment, topic) VALUES ($1, $2, $3, $4, $5)',
                [req.user.id, message, response.response, response.metadata?.sentiment || 'Neutral', response.metadata?.topic || 'General']
            );
        } catch (dbErr) {
            console.error('Failed to log AI conversation:', dbErr.message);
        }

        res.json(response);
    } catch (err) {
        console.error('Chatbot error:', err);
        res.status(500).json({ error: 'Failed to communicate with AI Assistant' });
    }
};

const uploadFile = async (req, res) => {
    // Basic file upload handler (Assumes multer is configured on the route)
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const form = new FormData();
        form.append('file', fs.createReadStream(req.file.path), req.file.originalname);
        
        const { AI_URL } = require('../services/aiService');
        const aiRes = await axios.post(`${AI_URL}/api/files/upload?user_id=${req.user.id}`, form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 30000 
        });
        
        // Clean up local temp file
        fs.unlinkSync(req.file.path);
        
        res.json(aiRes.data);
    } catch (err) {
        console.error('File Upload Proxy Error:', err);
        if (req.file && fs.existsSync(req.file.path)) {
             fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to upload and parse file to AI Engine' });
    }
};

module.exports = {
    getAiReport,
    verifyIdentity,
    chat,
    uploadFile
};
