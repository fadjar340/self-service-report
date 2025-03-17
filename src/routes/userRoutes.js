const express = require('express');
const userController = require('../controllers/userController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, isAdmin);

router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.get('/', userController.getUsers);

module.exports = router;