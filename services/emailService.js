const { Resend } = require('resend');

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
            to: 'nikhileshshingade341@gmail.com',
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

module.exports = {
    sendFeedbackEmail
};
