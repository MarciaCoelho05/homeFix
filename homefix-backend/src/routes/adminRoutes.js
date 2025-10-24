const express = require('express');
const { protect, admin } = require('../middlewares/authMiddleware');
const {
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllRequests,
  deleteRequest,
  getAllFeedbacks,
  deleteFeedback,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/users', protect, admin, getAllUsers);
router.patch('/users/:id/role', protect, admin, updateUserRole);
router.delete('/users/:id', protect, admin, deleteUser);

router.get('/requests', protect, admin, getAllRequests);
router.delete('/requests/:id', protect, admin, deleteRequest);

router.get('/feedbacks', protect, admin, getAllFeedbacks);
router.delete('/feedbacks/:id', protect, admin, deleteFeedback);

module.exports = router;
