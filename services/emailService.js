const { Resend } = require('resend');
const nodemailer = require('nodemailer');

/**
 * emailService
 * Handles sending automated alerts for feedback via Resend API.
 * This bypasses Railway SMTP port blocking.
 */

const sendFeedbackEmail = async (userId, userRoll, type, message) => {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[MAIL] Skipping email: RESEND_API_KEY is not set.');
            return false;
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
            from: 'ASTRA Beta <onboarding@resend.dev>',
            to: 'nikhileshshingade21@gmail.com',
            subject: `[${type.toUpperCase()}] New ASTRA Feedback from ${userRoll}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #3b82f6;">ASTRA Beta Feedback Received</h2>
                    <p><strong>User ID:</strong> ${userId}</p>
                    <p><strong>Roll Number:</strong> ${userRoll}</p>
                    <p><strong>Type:</strong> <span style="text-transform: capitalize; padding: 2px 6px; background: #eee; border-radius: 4px;">${type}</span></p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p><strong>Message:</strong></p>
                    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #3b82f6; font-style: italic;">
                        ${message}
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('[MAIL ERROR] Resend failure:', error);
            return false;
        }

        console.log('[MAIL] Feedback forwarded via Resend API:', data.id);
        return true;
    } catch (err) {
        console.error('[MAIL ERROR] Critical failure in Resend service:', err.message);
        return false;
    }
};

const sendResetEmail = async (userEmail, userName, resetToken) => {
    try {
        // Institutional Preference: Use SMTP (Gmail/Outlook) for production-grade reliability
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const mailOptions = {
                from: `"ASTRA Security" <${process.env.SMTP_USER}>`,
                to: userEmail,
                subject: 'Account Recovery: Password Reset Protocol',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 30px; border: 1px solid #1e293b; border-radius: 16px; background: #020617; color: #fff;">
                        <h2 style="color: #bf00ff;">ASTRA Security Link</h2>
                        <p>Hello, ${userName}. A password reset has been requested for your identity.</p>
                        <p>Provide the following secure code to finish the recovery protocol:</p>
                        <div style="background: rgba(191,0,255,0.1); padding: 15px; border: 1px dashed #bf00ff; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #bf00ff;">
                            ${resetToken}
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;"> This code will expire in 15 minutes. If you did not request this, please secure your identity immediately. </p>
                        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
                        <p style="font-size: 10px; color: #475569;"> ASTRA Institutional Sentinel | Secure OS Environment </p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log('[MAIL] Reset token delivered via Institutional SMTP Gateway');
            return true;
        }

        // Fallback: Using Resend API (Sandbox limitations apply)
        if (!process.env.RESEND_API_KEY) {
            console.warn('[MAIL] Skipping reset email: RESEND_API_KEY is not set.');
            return false;
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: 'ASTRA Security <security@resend.dev>',
            to: userEmail,
            subject: 'Account Recovery: Password Reset Protocol',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 30px; border: 1px solid #1e293b; border-radius: 16px; background: #020617; color: #fff;">
                    <h2 style="color: #bf00ff;">ASTRA Security Link</h2>
                    <p>Hello, ${userName}. A password reset has been requested for your identity.</p>
                    <p>Provide the following secure code to finish the recovery protocol:</p>
                    <div style="background: rgba(191,0,255,0.1); padding: 15px; border: 1px dashed #bf00ff; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #bf00ff;">
                        ${resetToken}
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('[MAIL ERROR] Resend failure:', error);
            return false;
        }

        console.log('[MAIL] Reset token delivered via Resend API:', data.id);
        return true;
    } catch (err) {
        console.error('[MAIL ERROR] Reset failure:', err.message);
        return false;
    }
};

module.exports = {
    sendFeedbackEmail,
    sendResetEmail
};
