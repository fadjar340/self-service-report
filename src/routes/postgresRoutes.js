const express = require('express');
const postgresController = require('../controllers/postgresController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/databases', postgresController.getDatabases);
router.get('/databases/:id', postgresController.getDatabase);
router.post('/databases', isAdmin, postgresController.saveDatabase);
router.put('/databases/:id', isAdmin, postgresController.updateDatabase);
router.delete('/databases/:id', isAdmin, postgresController.deleteDatabase);

router.get('/queries', postgresController.getQueries);
router.get('/queries/:id', postgresController.getQuery);
router.post('/queries', isAdmin, postgresController.saveQuery);
router.put('/queries/:id', isAdmin, postgresController.updateQuery);
router.delete('/queries/:id', isAdmin, postgresController.deleteQuery);

module.exports = router;