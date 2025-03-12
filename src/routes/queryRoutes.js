const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const queryController = require('../controllers/queryController');
//const authController = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { handleValidationErrors, validatePagination } = require('../middleware/validationMiddleware');

// Validation for executing queries
const executeQueryValidation = [
    param('queryId'),
    //    .isInt({ min: 1 })
    //    .withMessage('Query ID must be a positive integer'),
    body('databaseId')
    //    .isInt({ min: 1 })
    //    .withMessage('Database ID must be a positive integer')
];

// Validation for ad-hoc queries
const adHocQueryValidation = [
    body('databaseId'),
    //    .isInt({ min: 1 })
    //    .withMessage('Database ID must be a positive integer'),
    body('queryText')
        .trim()
        .notEmpty()
        .withMessage('Query text is required')
        .isLength({ max: 10000 })
        .withMessage('Query text is too long')
];

// Validation for saving queries
const saveQueryValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Query name is required')
        .isLength({ min: 3, max: 255 })
        .withMessage('Query name must be between 3 and 255 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description is too long'),
    body('queryText')
        .trim()
        .notEmpty()
        .withMessage('Query text is required')
        .isLength({ max: 10000 })
        .withMessage('Query text is too long'),
    body('isActive')
        .isBoolean()
        .withMessage('Status must be a boolean (true or false)')
];

// Validation for updating queries
const updateQueryValidation = [
    param('id'),
//        .isInt({ min: 1 })
//        .withMessage('Query ID must be a positive integer'),
    body().custom((value, { req }) => {
        if (!req.body.name && !req.body.description && !req.body.queryText) {
            throw new Error('At least one field (name, description, or queryText) must be provided');
        }
        return true;
    }),
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Query name cannot be empty')
        .isLength({ min: 3, max: 255 })
        .withMessage('Query name must be between 3 and 255 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description is too long'),
    body('queryText')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Query text cannot be empty')
        .isLength({ max: 10000 })
        .withMessage('Query text is too long'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('Status must be a boolean (true or false)')
];


// Validation for query listing
const listQueryValidation = [
    ...validatePagination,
    query('search')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Search term is too long')
];

// Routes
router.use(protect); // Protect all query routes

// Execute queries
router.post(
    '/execute/:queryId',
    isAdmin,
    executeQueryValidation,
    handleValidationErrors,
    queryController.executeQuery
);

router.post(
    '/execute-adhoc',
    isAdmin,
    adHocQueryValidation,
    handleValidationErrors,
    queryController.executeAdHocQuery
);

// Test Connection
router.post(
    '/test-connection',
    queryController.testConnection
);

// Query management
router.post(
    '/saveQuery',
    isAdmin,
    saveQueryValidation,
    handleValidationErrors,
    queryController.saveQuery
);

router.put(
    '/updateQuery/:id',
    isAdmin,
    updateQueryValidation,
    handleValidationErrors,
    queryController.updateQuery
);

router.delete(
    '/deleteQuery/:id',
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Query ID must be a positive integer')
    ],
    isAdmin,
    handleValidationErrors,
    queryController.deleteQuery
);

// Query retrieval
router.get(
    '/loadQueries',
    listQueryValidation,
    handleValidationErrors,
    queryController.getQueries
);

router.get(
    '/getQuery/:id',
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Query ID must be a positive integer')
    ],
    handleValidationErrors,
    queryController.getQuery
);

module.exports = router;
