const { Resend } = require('resend');

/**
 * ASTRA Email Service
 * ===================
 * Handles automated reporting and security alerts using Resend.
 */

let resend = null;
const API_KEY = process.env.RESEND_API_KEY;

if (API_KEY) {
    resend = new Resend(API_KEY);
    console.log('[EMAIL] Resend service initialized.');
} else {
    console.warn('[EMAIL] RESEND_API_KEY missing. Email functionality will be disabled.');
}

/**
 * Generic email sender
 * @param {string} to Recipient email
 * @param {string} subject Email subject
 * @param {string} html HTML content
 */
const sendEmail = async (to, subject, html) => {
    if (!resend) {
        console.error('[EMAIL] Attempted to send email but Resend is not initialized.');
        return { success: false, error: 'Email service uninitialized' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'ASTRA <notifs@astra.college>', // Fallback to verified domain in production
            to,
            subject,
            html,
        });

        if (error) {
            console.error('[EMAIL ERROR]', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('[EMAIL CRITICAL]', err);
        return { success: false, error: err.message };
    }
};

/**
 * Attendance Report Template
 * @param {string} adminEmail 
 * @param {object} stats { todayCount, yield }
 */
const sendAttendanceReport = async (adminEmail, stats) => {
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background-color: #f4f7ff; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">ASTRA INTELLIGENCE</h1>
                    <p style="color: rgba(255,255,255,0.8); margin-top: 5px;">Daily Attendance Digest</p>
                </div>
                <div style="padding: 40px;">
                    <p style="font-size: 16px; line-height: 1.6;">Hello Administrator,</p>
                    <p style="font-size: 16px; line-height: 1.6;">The automated system has aggregated today's attendance data for <b>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</b>.</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                            <span style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Present Today</span>
                            <span style="display: block; font-size: 32px; font-weight: 700; color: #6366f1;">${stats.todayCount}</span>
                        </div>
                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                            <span style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Verification Yield</span>
                            <span style="display: block; font-size: 32px; font-weight: 700; color: #22c55e;">${stats.yield}%</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 40px;">
                        <a href="https://astra.college/admin/dashboard" style="background: #6366f1; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">View Live Dashboard</a>
                    </div>
                </div>
                <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; 2026 ASTRA Integration Engine. All rights reserved.</p>
                </div>
            </div>
        </div>
    `;
    return sendEmail(adminEmail, `ASTRA: Attendance Report - ${new Date().toLocaleDateString()}`, html);
};

module.exports = {
    sendEmail,
    sendAttendanceReport
};
