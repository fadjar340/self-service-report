const express = require('express');
const router = express.Router();
const db = require('../services/db');
const authenticateJWT = require('../middleware/auth');
const { checkAdminRole } = require('../middleware/role');

// Fetch predefined queries (accessible to all authenticated users)
router.get('/predefined', authenticateJWT, async (req, res) => {
  try {
    const queries = await db.getPredefinedQueries();
    res.json({ success: true, data: queries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch predefined queries' });
  }
});

// Create a new query (admin only)
router.post('/predefined', authenticateJWT, checkAdminRole, async (req, res) => {
  const { name, sybase_query } = req.body;
  const createdBy = req.user.id; // Get user ID from JWT

  if (!name || !sybase_query) {
    return res.status(400).json({ success: false, message: 'Name and Sybase query are required' });
  }

  try {
    const newQuery = await db.createPredefinedQuery(name, sybase_query, createdBy);
    res.status(201).json({ success: true, data: newQuery });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create query' });
  }
});

// Update a query (admin only)
router.put('/predefined/:id', authenticateJWT, checkAdminRole, async (req, res) => {
  const { id } = req.params;
  const { name, sybase_query } = req.body;

  if (!name || !sybase_query) {
    return res.status(400).json({ success: false, message: 'Name and Sybase query are required' });
  }

  try {
    const updatedQuery = await db.updatePredefinedQuery(id, name, sybase_query);
    res.json({ success: true, data: updatedQuery });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update query' });
  }
});

// Delete a query (admin only)
router.delete('/predefined/:id', authenticateJWT, checkAdminRole, async (req, res) => {
  const { id } = req.params;

  try {
    await db.deletePredefinedQuery(id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete query' });
  }
});

// Run a predefined query (accessible to all authenticated users)
router.get('/run/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Start date and end date are required' });
  }

  // Parse the dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Validate the date range (maximum 31 days)
  const maxRange = 31 * 24 * 60 * 60 * 1000; // 31 days in milliseconds
  if (end - start > maxRange) {
    return res.status(400).json({ success: false, message: 'The maximum date range is 31 days' });
  }

  try {
    // Fetch the Sybase query from PostgreSQL
    const predefinedQuery = await db.getPredefinedQueryById(id);
    if (!predefinedQuery) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    // Execute the Sybase query using tedious
    const result = await db.executeSybaseQuery(predefinedQuery.sybase_query, { startDate: start, endDate: end });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to execute query' });
  }
});

module.exports = router;