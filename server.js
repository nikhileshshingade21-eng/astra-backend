require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { getDb, queryAll } = require('./database_module.js');

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');
const timetableRoutes = require('./routes/timetable');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const marksRoutes = require('./routes/marks');
const leavesRoutes = require('./routes/leaves');
const { scheduleV3Jobs } = require('./services/workflowEngine');
const socketService = require('./services/socketService');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// VULN-014 FIX: Strict Security headers via helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", process.env.CORS_ORIGINS || "http://localhost:3000", "http://localhost:8081"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// VULN-005 FIX: Restrictive CORS — configure allowed origins via env
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:8081'];
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: Origin not allowed'), false);
    },
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// VULN-012 FIX: HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
        }
        next();
    });
}

// VULN-013 FIX: Sanitized request logging (no sensitive data)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'ASTRA Backend', version: '1.0.0', time: new Date().toISOString() });
});

// Database check
app.get('/api/db-check', async (req, res) => {
    try {
        const db = await getDb();
        const result = await queryAll('SELECT NOW()');
        res.json({ status: 'ok', database: 'connected', time: result[0].now });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message, stack: err.stack });
    }
});

// 404 handler — catch unmatched routes
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler — sanitize errors in production
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// Start
async function start() {
    await getDb(); // Initialize database
    await scheduleV3Jobs(); // Start V3 Autonomous Workflows
    
    const server = http.createServer(app);
    socketService.init(server);

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n  ╔══════════════════════════════════════╗`);
        console.log(`  ║   ASTRA Backend Server v1.0.0        ║`);
        console.log(`  ║   Running on http://0.0.0.0:${PORT}     ║`);
        console.log(`  ╚══════════════════════════════════════╝\n`);

        // Show local IP for phone connection
        const os = require('os');
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    console.log(`  📱 Connect your phone to: http://${net.address}:${PORT}`);
                }
            }
        }
        console.log('');
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
