const express = require('express');
const { register, login, forgotPassword, resetPassword } = require('../controllers/authControllers');
const { protect, admin } = require('../middlewares/authMiddleware');
const prisma = require('../prismaClient');

const router = express.Router();

router.use((req, res, next) => {
  console.log(`[userRoutes] ${req.method} ${req.path}`);
  next();
});

router.post('/register', register);
router.post('/login', login);
router.post('/forgot', forgotPassword);
router.post('/reset', resetPassword);

router.patch('/:id/role', protect, admin, async (req, res) => {
  const id = req.params.id;
  const { isAdmin, isTechnician } = req.body || {};
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof isAdmin === 'boolean' ? { isAdmin } : {}),
        ...(typeof isTechnician === 'boolean' ? { isTechnician } : {})
      }
    });
    res.json({ id: user.id, email: user.email, isAdmin: user.isAdmin, isTechnician: user.isTechnician });
  } catch (err) {
    res.status(400).json({ message: 'Não foi possível atualizar o utilizador' });
  }
});

module.exports = router;

