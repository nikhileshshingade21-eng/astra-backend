// Response Helper Formatter Middleware
// Provides res.success() and res.error() to standardize API contract formats.

module.exports = function responseHandler(req, res, next) {
    res.success = function (data = null, message = 'Operation successful') {
        return res.json({ success: true, message, data });
    };

    res.error = function (message = 'An error occurred', data = null, statusCode = 400) {
        return res.status(statusCode).json({ success: false, message, data });
    };

    next();
};
