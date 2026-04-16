/**
 * Lightweight Dependency-Free Schema Validator
 * Validates request bodies against defined schemas.
 */

const validate = (schema, payload) => {
    const errors = [];
    
    // Check missing and type mismatches
    Object.keys(schema).forEach(key => {
        const rules = schema[key];
        const value = payload[key];
        
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${key} is required.`);
        } else if (value !== undefined && value !== null) {
            // Type checking
            if (rules.type === 'array' && !Array.isArray(value)) {
                errors.push(`${key} must be an array.`);
            } else if (rules.type === 'number' && isNaN(Number(value))) {
                errors.push(`${key} must be a number.`);
            } else if (rules.type !== 'array' && typeof value !== rules.type) {
                errors.push(`${key} must be of type ${rules.type}.`);
            }
            
            // Enum checking
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`${key} must be one of [${rules.enum.join(', ')}].`);
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Express Middleware
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { isValid, errors } = validate(schema, req.body);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                data: { errors }
            });
        }
        next();
    };
};

module.exports = { validate, validateRequest };
