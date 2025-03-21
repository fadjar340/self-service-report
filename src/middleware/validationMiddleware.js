const { validationResult } = require('express-validator');
const { query } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation error',
            message: 'Invalid input data',
            details: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

const validateAuditLogsQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date')
        .toDate(),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .toDate(),
    query('action')
        .optional()
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Action must be a non-empty string'),
    query('userId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer')
        .toInt()
];

const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt()
];

const validateDateRange = [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date')
        .toDate(),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .toDate()
];

const validateDateOrder = (req, res, next) => {
    const { startDate, endDate } = req.query;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({
            error: 'Validation error',
            message: 'End date must be after start date'
        });
    }
    next();
};

const validateLimit = (min, max) => {
    return (req, res, next) => {
        const limit = parseInt(req.query.limit);
        if (limit && (limit < min || limit > max)) {
            return res.status(400).json({
                error: 'Validation error',
                message: `Limit must be between ${min} and ${max}`
            });
        }
        next();
    };
};

const sanitizeQueryParams = (req, res, next) => {
    if (req.query.includeDeleted) {
        req.query.includeDeleted = req.query.includeDeleted === 'true';
    }

    ['page', 'limit', 'userId'].forEach(param => {
        if (req.query[param]) {
            req.query[param] = parseInt(req.query[param]);
        }
    });

    req.query.page = req.query.page || 1;
    req.query.limit = req.query.limit || 50;

    next();
};

module.exports = {
    handleValidationErrors,
    validateAuditLogsQuery,
    validatePagination,
    validateDateRange,
    validateDateOrder,
    validateLimit,
    sanitizeQueryParams
};