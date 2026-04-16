const nodemailer = require('nodemailer');
const { Resend } = require('resend');

/**
 * ASTRA Email Service
 * ===================
 * Handles automated reporting, feedback, and security alerts.
 * Uses Nodemailer (Gmail) as primary and Resend as fallback.
 */

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'nikhileshshingade21@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

let transporter = null;
let resend = null;

// Initialize Nodemailer (Primary)
if (GMAIL_USER && GMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_PASS
        }
    });
    console.log('[EMAIL] Nodemailer (Gmail) initialized.');
}

// Initialize Resend (Optional Fallback)
if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
    console.log('[EMAIL] Resend service initialized.');
}

if (!transporter && !resend) {
    console.warn('[EMAIL] No email service configured. Email functionality will be disabled.');
}

/**
 * Generic email sender
 * @param {string} to Recipient email
 * @param {string} subject Email subject
 * @param {string} html HTML content
 */
const sendEmail = async (to, subject, html) => {
    // Try Nodemailer First
    if (transporter) {
        try {
            const info = await transporter.sendMail({
                from: `"ASTRA Intelligence" <${GMAIL_USER}>`,
                to,
                subject,
                html
            });
            console.log('[EMAIL] Sent via Gmail:', info.messageId);
            return { success: true, data: info };
        } catch (err) {
            console.error('[EMAIL GMAIL ERROR]', err.message);
            // Fall through to Resend if available
        }
    }

    // Fallback to Resend
    if (resend) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'ASTRA <notifs@astra.college>',
                to,
                subject,
                html,
            });
            if (error) throw error;
            console.log('[EMAIL] Sent via Resend:', data.id);
            return { success: true, data };
        } catch (err) {
            console.error('[EMAIL RESEND ERROR]', err.message);
        }
    }

    return { success: false, error: 'All email services failed or uninitialized' };
};

/**
 * Attendance Report Template
 */
const sendAttendanceReport = async (to, stats) => {
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background-color: #f4f7ff; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">ASTRA INTELLIGENCE</h1>
                    <p style="color: rgba(255,255,255,0.8); margin-top: 5px;">Daily Attendance Digest</p>
                </div>
                <div style="padding: 40px;">
                    <p style="font-size: 16px; line-height: 1.6;">Hello Administrator,</p>
                    <p style="font-size: 16px; line-height: 1.6;">The automated system has aggregated today's data.</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; margin: 20px 0;">
                        <span style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Present Today</span>
                        <span style="display: block; font-size: 32px; font-weight: 700; color: #6366f1;">${stats.todayCount}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    return sendEmail(to || ADMIN_EMAIL, `ASTRA: Attendance Report`, html);
};

/**
 * Feedback Email
 */
const sendFeedbackEmail = async (userId, userRoll, type, message) => {
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #6366f1;">New ASTRA Feedback</h2>
            <p><strong>Student:</strong> ${userRoll} (ID: ${userId})</p>
            <p><strong>Category:</strong> <span style="text-transform: uppercase; color: #e11d48; font-weight: bold;">${type}</span></p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Message:</strong></p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; white-space: pre-wrap;">
                ${message}
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">This is an automated message from the ASTRA Identity Engine.</p>
        </div>
    `;
    return sendEmail(ADMIN_EMAIL, `ASTRA Feedback: ${type.toUpperCase()} from ${userRoll}`, html);
};

module.exports = {
    sendEmail,
    sendAttendanceReport,
    sendFeedbackEmail
};
