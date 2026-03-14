const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');
const timetableRoutes = require('./routes/timetable');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const marksRoutes = require('./routes/marks');
const leavesRoutes = require('./routes/leaves');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'ASTRA Backend', version: '1.0.0', time: new Date().toISOString() });
});

// Start
async function start() {
    await getDb(); // Initialize database
    app.listen(PORT, '0.0.0.0', () => {
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
