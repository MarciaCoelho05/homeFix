const express = require('express');
const { protect, admin } = require('../middlewares/authMiddleware');
const { getAllUsers, promoteToTech, getUserById, updateUser, deleteUser } = require('../controllers/adminController');

const router = express.Router();

router.get('/users', protect, admin, getAllUsers);
router.put('/users/:id/promote', protect, admin, promoteToTech);
router.get('/users/:id', protect, admin, getUserById);
router.put('/users/:id', protect, admin, updateUser);
router.delete('/users/:id', protect, admin, deleteUser);

module.exports = router;