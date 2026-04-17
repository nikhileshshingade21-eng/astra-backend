require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getDb, queryAll } = require('./database_module.js');

const normalizePayload = require('./adapters/normalizeMiddleware');

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');
const timetableRoutes = require('./routes/timetable');
const { authMiddleware: protect } = require('./middleware');
const { submitFeedback, getAllFeedback } = require('./controllers/feedbackController');
const { isRedisConnected } = require('./services/cacheService');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const marksRoutes = require('./routes/marks');
const leavesRoutes = require('./routes/leaves');
const { getAnnouncements, createAnnouncement } = require('./controllers/announcementController');
const { scheduleV3Jobs } = require('./services/workflowEngine');
const { checkVersion } = require('./controllers/versionController');
const socketService = require('./services/socketService');
const http = require('http');
const fs = require('fs');

const path = require('path');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (required by express-rate-limit for Railway)

// ASTRA V7 PRODUCTION: Serve static landing page
app.use(express.static(path.join(__dirname, 'public')));

// SEC-021: Strict Payload limits to prevent OOM restarts
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Integration Layer: Strict Global Response Wrapper
const responseHandler = require('./middleware/responseHandler');
app.use(responseHandler);

// Integration Layer: Network Debugging
const debugNetwork = require('./middleware/debugNetwork');
app.use(debugNetwork);

// Integration Layer: Payload Normalization (Exported for specific routes, not global)
// app.use(normalizePayload);

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
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/placements', require('./routes/placements'));
app.use('/api/ai/approvals', require('./routes/aiApprovals'));
app.use('/api/tenant', require('./routes/tenant'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api', require('./routes/system'));
app.get('/api/download/latest', (req, res) => {
    // Current release artifact
    res.redirect('https://github.com/nikhil/astra/releases/download/v1.2.1/app-release.apk');
});

// REAL WEATHER API — Proxied through backend for caching + reliability
let weatherCache = { data: null, timestamp: 0 };
const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

app.get('/api/weather', async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat) || 17.385;
        const lng = parseFloat(req.query.lng) || 78.4867;
        const now = Date.now();
        const cacheKey = `${Math.round(lat * 10)}:${Math.round(lng * 10)}`;
        
        if (weatherCache.data && weatherCache.key === cacheKey && (now - weatherCache.timestamp) < WEATHER_CACHE_TTL) {
            return res.success(weatherCache.data);
        }

        const axios = require('axios');
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;
        const response = await axios.get(apiUrl, { timeout: 8000 });
        const current = response.data?.current;

        if (!current) {
            return res.error('Weather API returned empty data', null, 502);
        }

        const WMO_CODES = {
            0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Rime Fog', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Dense Drizzle',
            61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain', 71: 'Light Snow', 73: 'Snow',
            80: 'Rain Showers', 81: 'Moderate Showers', 82: 'Heavy Showers',
            95: 'Thunderstorm', 96: 'Thunderstorm + Hail', 99: 'Severe Thunderstorm'
        };

        const result = {
            temp: Math.round(current.temperature_2m),
            condition: WMO_CODES[current.weather_code] || 'Unknown',
            weather_code: current.weather_code,
            humidity: current.relative_humidity_2m,
            wind_speed: Math.round(current.wind_speed_10m),
            fetched_at: new Date().toISOString()
        };

        weatherCache = { data: result, timestamp: now, key: cacheKey };
        res.success(result);
    } catch (err) {
        console.error('[WEATHER] API Error:', err.message);
        res.error('Weather service temporarily unavailable', null, 502);
    }
});

app.get('/api/health', (req, res) => {
    res.success({ 
        status: 'ok', 
        server: 'ASTRA Backend', 
        version: '1.0.6', 
        env: process.env.NODE_ENV || 'development',
        time: new Date().toISOString(),
        redis_connected: isRedisConnected(),
        db_configured: !!(process.env.DATABASE_URL || process.env.DB_HOST),
        jwt_configured: !!process.env.JWT_SECRET,
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

app.use((req, res) => res.error('Endpoint not found', null, 404));

app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    // DEBUG: Temporarily return err.message in production to catch the registration crash
    res.error(err.message || 'Internal error', null, err.status || 500);
});

const { validateSchema } = require('./schema_validator');

const server = http.createServer(app);
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
server.timeout = 120000;

async function start() {
    socketService.init(server);
    // FIX: Railway Redis addon injects PORT=6379 which collides with our HTTP port.
    // Use RAILWAY_PORT first, then PORT (but reject 6379), then fallback to 3000.
    let PORT = process.env.RAILWAY_PORT || process.env.PORT || 3000;
    if (String(PORT) === '6379') {
        console.warn('[PORT] Detected Redis port 6379 as PORT — overriding to 3000. Set RAILWAY_PORT or PORT_HTTP to fix.');
        PORT = 3000;
    }
    server.listen(PORT, async () => {
        console.log(`🚀 ASTRA Backend running on http://0.0.0.0:${PORT}`);
        
        // Initialize each service independently so one failure doesn't cascade
        try {
            const db = await getDb(); 
            console.log('[DB] Database pool acquired.');
        } catch (err) {
            console.error('[CRITICAL] Database init failed:', err.message);
        }

        try {
            await validateSchema(); // 🛡️ Ensure structural integrity
        } catch (err) {
            console.error('[WARN] Schema validation failed:', err.message);
        }

        try {
            await scheduleV3Jobs();
        } catch (err) {
            console.error('[WARN] V3 job scheduling failed:', err.message);
        }

        try {
            // Start class notification scheduler if credentials found
            const { startScheduler } = require('./scheduler/classNotifier');
            startScheduler();
        } catch (err) {
            console.error('[WARN] Class notification scheduler failed:', err.message);
        }

        try {
            // Start SMART notification engine (weather, reminders, nudges, streaks)
            const { startSmartScheduler } = require('./scheduler/smartScheduler');
            startSmartScheduler();
        } catch (err) {
            console.error('[WARN] Smart notification engine failed:', err.message);
        }
        try {
            // Flush stale cache on every deploy to prevent stale timetable/schedule data
            const { flushAll } = require('./services/cacheService');
            setTimeout(() => flushAll().catch(e => console.warn('[CACHE] Startup flush failed:', e.message)), 5000);
        } catch (err) {
            console.error('[WARN] Cache flush failed:', err.message);
        }
            
        console.log('[READY] ASTRA Services Synced.');
    });
}

// Process-level crash guards — prevent silent exits
process.on('unhandledRejection', (reason, promise) => {
    console.error('[PROCESS] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
    console.error('[PROCESS] Uncaught Exception:', err.message);
    console.error(err.stack);
    // Don't exit — keep the server alive for non-fatal exceptions
});

start().catch(err => {
    console.error('Fatal Start Error:', err);
    process.exit(1);
});

