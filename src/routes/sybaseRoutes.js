const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const SybaseDatabase = require('../models/sybaseDatabase');
const { body, param, query } = require('express-validator');
const sybaseController = require('../controllers/sybaseController');
const { handleValidationErrors, validatePagination } = require('../middleware/validationMiddleware');

// Validation for saving Sybase database
const saveDatabaseValidation = [
    body('conn_name')
        .trim()
        .notEmpty()
        .withMessage('Database name is required')
        .isLength({ min: 3, max: 255 })
        .withMessage('Name must be between 3 and 255 characters'),
    body('host')
        .trim()
        .notEmpty()
        .withMessage('Host is required')
        .isLength({ max: 30 })
        .withMessage('Host is too long'),
    body('port')
        .trim()
        .notEmpty()
        .withMessage('Port is required')
        .isInt({ min: 1, max: 65535 }) // Corrected port range
        .withMessage('Port must be a valid integer between 1 and 65535')
        .toInt(),
    body('database_name')
        .trim()
        .notEmpty()
        .withMessage('Database name is required')
        .isLength({ max: 100 })
        .withMessage('Database name is too long'),
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ max: 25 })
        .withMessage('Username is too long'),
    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ max: 25 })
        .withMessage('Password is too long'),
    body('isActive')
        .isBoolean()
        .withMessage('Status must be a boolean (true or false)')
];

// Validation for updating Sybase database
const updateDatabaseValidation = [
    param('id'),
    body('conn_name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Database connection name is required')
        .isLength({ min: 3, max: 255 })
        .withMessage('Name must be between 3 and 255 characters'),
    body('host')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Host is required')
        .isLength({ max: 30 })
        .withMessage('Host is too long'),
    body('port')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Port is required')
        .isInt({ min: 1, max: 65535 }) // Corrected port range
        .withMessage('Port must be a valid integer between 1 and 65535')
        .toInt(),
    body('database_name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Database name is required')
        .isLength({ max: 100 })
        .withMessage('Database name is too long'),
    body('username')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ max: 25 })
        .withMessage('Username is too long'),
    body('password')
        .optional()
        .trim(),
    body('isActive')
        .optional()
        .trim()
        .isBoolean()
        .withMessage('Status must be a boolean (true or false)')
];

// Validation for updating Sybase database
const deleteDatabaseValidation = [
    param('id'),
    body('isDeleted')
        .optional()
        .trim()
        .isBoolean()
        .withMessage('Status must be a boolean (true or false)')
];

// Validation for query listing
const listDatabaseValidation = [
    ...validatePagination,
    query('search')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Search term is too long')
];

// Apply authentication middleware to all routes
router.use(protect);

// Query management
router.post(
    '/saveDatabase',
    isAdmin,
    saveDatabaseValidation,
    handleValidationErrors,
    (req, res, next) => {
        // Set createdBy and updatedBy from the authenticated user
        req.body.createdBy = req.user.id; // Assuming req.user contains the authenticated user
        req.body.updatedBy = req.user.id;
        //req.body.isActive = true||false;
        //req.body.isDeleted = true||false;
        next();
    },
    sybaseController.saveDatabase
);

router.put(
    '/updateDatabase/:id',
    isAdmin,
    updateDatabaseValidation,
    handleValidationErrors,
    (req, res, next) => {
        // Set updatedBy from the authenticated user
        req.body.updatedBy = req.user.id;
         // Assuming req.user contains the authenticated user
        //req.body.isActive = true||false;
        //req.body.isDeleted = true||false;
        next();
    },
    sybaseController.updateDatabase
);

router.delete(
    '/deleteDatabase/:id',
    isAdmin,
    deleteDatabaseValidation,
    [
        param('id')
           .isInt({ min: 1 })
           .withMessage('Database ID must be a positive integer')
    ],
    handleValidationErrors,
    (req, res, next) => {
        req.body.isDeleted = true;
        next();
    },
    sybaseController.deleteDatabase
);

// Query retrieval
router.get(
    '/loadDatabases',
    listDatabaseValidation,
    handleValidationErrors,
    sybaseController.loadDatabases
);

router.get(
    '/getDatabase:id',
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Database ID must be a positive integer')
    ],
    handleValidationErrors,
    sybaseController.getDatabase
);

module.exports = router;