const express = require('express');
const router = express.Router();
const db = require('../services/db');
const authenticateJWT = require('../middleware/auth');
const { checkAdminRole } = require('../middleware/role');

// Fetch all Sybase databases (admin only)
router.get('/', authenticateJWT, checkAdminRole, async (req, res) => {
  try {
    const databases = await db.getSybaseDatabases(); // Ensure this function is defined in db.js
    res.json(databases);
  } catch (error) {
    console.error(error);
    res.status(500).json({
        "success": false,
        "message": 'Failed to fetch database'
      });
  }
});

// Create a new Sybase database (admin only)
router.post('/', authenticateJWT, checkAdminRole, async (req, res) => {
  const { name, server, db_user, password, database, port } = req.body;
  const createdBy = req.user.id; // Get user ID from JWT

  if (!name || !server || !db_user || !password || !database || !port) {
    return res.status(400).json({
        "success": false,
        "message": 'All fields are required'
      });
  }

  try {
    const newDatabase = await db.createSybaseDatabase(name, server, db_user, password, database, port, createdBy); // Ensure this function is defined in db.js
    res.status(201).json(newDatabase);
  } catch (error) {
    console.error(error);
    res.status(500).json({
        "success": false,
        "message": 'Failed to create database'
      });
  }
});

// Update a Sybase database (admin only)
router.put('/:id', authenticateJWT, checkAdminRole, async (req, res) => {
  const { id } = req.params;
  const { name, server, db_user, password, database, port } = req.body;

  if (!name || !server || !db_user || !password || !database || !port) {
    return res.status(400).json({
        "success": false,
        "message": 'All fields are required'
      });
  }

  try {
    const updatedDatabase = await db.updateSybaseDatabase(id, name, server, db_user, password, database, port); // Ensure this function is defined in db.js
    res.json(updatedDatabase);
  } catch (error) {
    console.error(error);
    res.status(500).json({
        "success": false,
        "message": 'Failed to update database'
      });
  }
});

// Delete a Sybase database (admin only)
router.delete('/:id', authenticateJWT, checkAdminRole, async (req, res) => {
  const { id } = req.params;

  try {
    await db.deleteSybaseDatabase(id); // Ensure this function is defined in db.js
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({
        "success": false,
        "message": 'Failed to delete database'
      });
  }
});

module.exports = router;
