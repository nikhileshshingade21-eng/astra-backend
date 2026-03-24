const nodemailer = require('nodemailer');

/**
 * emailService
 * Handles sending automated alerts for feedback, threats, and campus notifications.
 */

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'nikhileshshingade341@gmail.com',
        pass: process.env.EMAIL_PASS // User will need to provide Gmail App Password
    }
});

const sendFeedbackEmail = async (userId, userRoll, type, message) => {
    try {
        const mailOptions = {
            from: `"ASTRA Beta Feedback" <${process.env.EMAIL_USER || 'nikhileshshingade341@gmail.com'}>`,
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
                    <p style="margin-top: 30px; font-size: 12px; color: #888;">This is an automated notification from the ASTRA Backend.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[MAIL] Feedback forwarded to Gmail:', info.messageId);
        return true;
    } catch (err) {
        console.error('[MAIL ERROR] Failed to send feedback email:', err.message);
        return false;
    }
};

module.exports = {
    sendFeedbackEmail
};
