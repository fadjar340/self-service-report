const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const auditController = require('../controllers/auditController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// Validation middleware
const validateGetLogs = [
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

// Routes
router.use(protect); // Protect all audit routes
router.use(isAdmin); // Restrict to admin users only

router.get(
    '/get-audit',
    validateGetLogs,
    protect,
    isAdmin,
    handleValidationErrors,
    auditController.getAuditLogs
);

router.get('/actions', protect, isAdmin, auditController.getAuditActions);
router.get('/stats',  protect, isAdmin, auditController.getAuditStats);

// Add endpoint to delete old audit logs
router.delete('/old',  protect, isAdmin, auditController.deleteOldAuditLogs);

module.exports = router;
