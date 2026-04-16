const { ZodError } = require('zod');

const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            // Zod can parse body, query, and params. Reassign output to strip unknown fields.
            const parsed = schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            
            if (parsed.body) req.body = parsed.body;
            if (parsed.query) req.query = parsed.query;
            if (parsed.params) req.params = parsed.params;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = error.errors.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                // Use res.error provided by responseHandler
                return res.error('Validation failed', errorMessages, 400);
            }
            return res.error('Internal Server Error', null, 500);
        }
    };
};

module.exports = { validateRequest };
