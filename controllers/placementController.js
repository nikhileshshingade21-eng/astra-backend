const { getDb, queryAll, saveDb } = require('../database_module.js');
const aiService = require('../services/aiService');

/**
 * Get all available jobs (or filter by generic criteria)
 */
const getJobs = async (req, res) => {
    try {
        const result = await queryAll(`
            SELECT id, company, title, description, req_skills, min_cgpa, created_at
            FROM jobs
            ORDER BY created_at DESC
        `);

        let jobs = [];
        if (result.length && result[0].values.length) {
            jobs = result[0].values.map(row => ({
                id: row[0],
                company: row[1],
                title: row[2],
                description: row[3],
                req_skills: row[4],
                min_cgpa: row[5],
                created_at: row[6]
            }));
        }

        res.json({ jobs });
    } catch (err) {
        console.error('Placement error:', err);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
};

/**
 * 🧠 AI Powered: Get Job Recommendations tailored to the student's marks and attendance
 */
const getRecommendations = async (req, res) => {
    try {
        const studentId = req.user.id;
        
        // 1. Fetch student's academic profile (Marks)
        const marksRes = await queryAll('SELECT subject, marks FROM marks WHERE user_id = ?', [studentId]);
        const marks = marksRes.length && marksRes[0].values.length 
            ? marksRes[0].values.map(m => m[1]) 
            : [];
        
        // Calculate very rough CGPA proxy
        const avgMarks = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
        const studentCgpa = (avgMarks / 10).toFixed(1);

        // 2. Fetch all jobs
        const result = await queryAll(`SELECT id, company, title, req_skills, min_cgpa FROM jobs`);
        let availableJobs = [];
        if (result.length && result[0].values.length) {
            availableJobs = result[0].values.map(row => ({
                id: row[0],
                company: row[1],
                title: row[2],
                req_skills: row[3],
                min_cgpa: row[4]
            }));
        }

        if (availableJobs.length === 0) {
            return res.json({ recommendations: [] });
        }

        // 3. Send to AI Engine to calculate match percentages
        const recommendations = await aiService.matchJobs(studentId, studentCgpa, availableJobs);
        res.json({ recommendations });

    } catch (err) {
        console.error('Placement Recommendation error:', err);
        res.status(500).json({ error: 'Failed to fetch AI recommendations' });
    }
};

/**
 * Admin: Add a new job
 */
const addJob = async (req, res) => {
    try {
        // Simple authorization check
        if (req.user.role !== 'admin' && req.user.role !== 'faculty') {
            return res.status(403).json({ error: 'Admin access required to post jobs' });
        }

        const { company, title, description, req_skills, min_cgpa } = req.body;
        if (!company || !title) {
            return res.status(400).json({ error: 'Company and Title are required' });
        }

        await queryAll(
            `INSERT INTO jobs (company, title, description, req_skills, min_cgpa)
             VALUES (?, ?, ?, ?, ?)`,
            [company, title, description, req_skills || '', min_cgpa || 0]
        );
        saveDb();

        res.status(201).json({ message: 'Job posted successfully' });
    } catch (err) {
        console.error('Placement error:', err);
        res.status(500).json({ error: 'Failed to post job' });
    }
};

module.exports = {
    getJobs,
    getRecommendations,
    addJob
};
