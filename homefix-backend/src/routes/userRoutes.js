const express = require('express');
const { register, login, forgotPassword, resetPassword } = require('../controllers/authControllers');
const { protect, admin } = require('../middlewares/authMiddleware');
const prisma = require('../prismaClient');

const router = express.Router();

router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    console.log(`[userRoutes] OPTIONS preflight - returning 204`);
    return res.status(204).end();
  }
  
  console.log(`[userRoutes] ${req.method} ${req.path} - Body keys:`, req.body ? Object.keys(req.body) : 'no body');
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

