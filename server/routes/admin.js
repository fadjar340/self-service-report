const express = require('express');
const router = express.Router();
const db = require('../services/db');
const authenticateJWT = require('../middleware/auth');

// Check if user is an admin
router.get('/check/:username', authenticateJWT, async (req, res) => {
    const { username } = req.params;

    try {
        const isAdmin = await db.checkIfAdmin(username); // Implement this function in your db service
        res.json({ isAdmin });
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ success: false, message: 'Error checking admin status' });
    }
});

module.exports = router;
