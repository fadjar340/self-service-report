const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/execute/:queryId', isAdmin, queryController.executeQuery);
router.post('/execute-adhoc', isAdmin, queryController.executeAdHocQuery);
router.post('/saveQuery', isAdmin, queryController.saveQuery);
router.put('/updateQuery/:id', isAdmin, queryController.updateQuery);
router.delete('/deleteQuery/:id', isAdmin, queryController.deleteQuery);
router.get('/loadQueries', queryController.getQueries);
router.get('/getQuery/:id', queryController.getQuery);

module.exports = router;