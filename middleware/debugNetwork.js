/**
 * Debug Network Middleware
 * Inspects parsed payloads AFTER normalization and BEFORE processing
 * to assist in tracking integration layers.
 */

const debugNetwork = (req, res, next) => {
    // Only trace in Development or if explicitly asked in prod via header
    if (process.env.NODE_ENV === 'development' || req.headers['x-astra-trace']) {
        console.log('\n[DEBUG TRACE] ------------------------');
        console.log(`[ROUTE] ${req.method} ${req.originalUrl}`);
        console.log(`[HEADERS] Content-Type: ${req.headers['content-type']}`);
        
        if (req.body && Object.keys(req.body).length > 0) {
            console.log('[NORMALIZED BODY]', JSON.stringify(req.body, null, 2));
        }

        // Intercept response globally for tracing output
        const originalSend = res.json;
        res.json = function (body) {
            console.log(`[RESPONSE CAPTURE ${res.statusCode}]`, JSON.stringify(body, null, 2).slice(0, 300) + (JSON.stringify(body).length > 300 ? '...\n(truncated)' : ''));
            console.log('--------------------------------------\n');
            return originalSend.call(this, body);
        };
    }
    next();
};

module.exports = debugNetwork;
