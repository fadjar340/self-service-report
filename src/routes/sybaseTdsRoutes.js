const express = require('express');
const sybaseTdsController = require('../controllers/sybaseTdsController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/test-connection', sybaseTdsController.testConnection);
router.post('/execute', protect, sybaseTdsController.executeQuery);
router.post('/execute-adhoc', protect, sybaseTdsController.executeAdHocQuery);

module.exports = router;