const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// Login validation
const loginValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
];

// User creation validation
const createUserValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 255 })
        .withMessage('Username must be between 3 and 255 characters'),
    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('role')
        .trim()
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['admin', 'user'])
        .withMessage('Role must be either admin or user'),
];

// User update validation
const updateUserValidation = [
    body('username')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Username cannot be empty')
        .isLength({ min: 3, max: 255 })
        .withMessage('Username must be between 3 and 255 characters'),
    body('password')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Password cannot be empty')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('role')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Role cannot be empty')
        .isIn(['admin', 'user'])
        .withMessage('Role must be either admin or user')
];

// Public routes
router.post('/login', loginValidation, handleValidationErrors, authController.login);
router.post('/logout', authController.logout);

// Protected routes
router.get('/current-user', protect, authController.getCurrentUser); 
router.get('/users', protect, isAdmin, authController.getUsers);
router.post('/users', protect, isAdmin, createUserValidation, handleValidationErrors, authController.createUser);
router.put('/users/:id', protect, isAdmin, updateUserValidation, handleValidationErrors, authController.updateUser);
router.delete('/users/:id', protect, isAdmin, authController.deleteUser);

module.exports = router;
