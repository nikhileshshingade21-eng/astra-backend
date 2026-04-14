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
    // SEC-001 STRICT UPGRADE: Custom AI Face recognition was deprecated.
    // The mobile application now enforces OS-level BIOMETRIC_STRONG hardware verification keys directly.
    return res.status(410).json({ 
        verified: false, 
        error: 'DEPRECATED: Custom Face Verification is offline. ASTRA now relies exclusively on strictly-bound Native OS Biometrics (Face ID / Fingerprint).' 
    });
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
