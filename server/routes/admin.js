const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');

// Admin-only route
router.get('/admin-data', authenticateJWT, (req, res) => {
  res.json({ message: 'This is admin-only data' });
});

module.exports = router;