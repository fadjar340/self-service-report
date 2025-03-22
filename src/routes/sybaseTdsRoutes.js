const express = require('express');
const sybaseConnectionController = require('../controllers/sybaseConnectionController');
const sybaseQueryController = require('../controllers/sybaseQueryController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Test connection to Sybase
router.post('/test-connection/:id', protect, sybaseConnectionController.testConnection);

// Execute a saved query against Sybase
router.post('/execute', protect, sybaseQueryController.executeQuery);

// Execute an ad-hoc query against Sybase
router.post('/execute-adhoc/:id', protect, sybaseQueryController.executeAdHocQuery);

module.exports = router;