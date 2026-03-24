require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getDb, queryAll } = require('./database_module.js');

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');
const timetableRoutes = require('./routes/timetable');
const { authMiddleware: protect } = require('./middleware');
const { submitFeedback, getAllFeedback } = require('./controllers/feedbackController');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const marksRoutes = require('./routes/marks');
const leavesRoutes = require('./routes/leaves');
const { getAnnouncements, createAnnouncement } = require('./controllers/announcementController');
const { scheduleV3Jobs } = require('./services/workflowEngine');
const socketService = require('./services/socketService');
const http = require('http');

const app = express();

// INCREASED LIMITS FOR LARGE PAYLOADS
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// VULN-014 FIX: Strict Security headers via helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ["http://localhost:3000"]), "http://localhost:8081"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// VULN-005 FIX: Restrictive CORS
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:8081'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        return callback(new Error('CORS policy: Origin not allowed'), false);
    },
    credentials: true
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts. Try again later.' } });

// CLEAN REQUEST LOGGING
app.use((req, res, next) => {
    const size = req.headers['content-length'] ? (req.headers['content-length'] / 1024).toFixed(2) + ' KB' : '0KB';
    console.log(`[📡 ${new Date().toISOString()}] ${req.method} ${req.path} - Size: ${size}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/placements', require('./routes/placements'));
app.use('/api/ai/approvals', require('./routes/aiApprovals'));

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        server: 'ASTRA Backend', 
        version: '1.0.5', 
        time: new Date().toISOString(),
        redis_connected: isRedisConnected(),
        email_service: {
            method: 'Resend API',
            resend_set: !!process.env.RESEND_API_KEY
        }
    });
});

app.post('/api/feedback', protect, submitFeedback);
app.get('/api/feedback', protect, getAllFeedback);
app.get('/api/announcements', protect, getAnnouncements);
app.post('/api/announcements', protect, createAnnouncement);

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message });
});

// INITIALIZE SERVER WITH LONGER TIMEOUTS
const server = http.createServer(app);
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
server.timeout = 120000;

async function start() {
    socketService.init(server);
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, async () => {
        console.log(`🚀 ASTRA Backend running on http://0.0.0.0:${PORT}`);
        try {
            await getDb(); 
            await scheduleV3Jobs(); 
            console.log('[READY] ASTRA Services Synced.');
        } catch (err) {
            console.error('[CRITICAL] Startup Failed:', err.message);
        }
    });
}

start().catch(err => {
    console.error('Fatal Start Error:', err);
    process.exit(1);
});
