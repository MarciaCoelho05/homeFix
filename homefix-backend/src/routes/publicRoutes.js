const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Public routes working!' });
});

router.get('/requests', async (req, res) => {
  console.log('Public route /requests called');
  console.log('Query params:', req.query);
  console.log('Full URL:', req.url);
  console.log('Path:', req.path);
  
  const { status } = req.query || {};
  const where = {
    feedback: { isNot: null }
  };
  if (status) {
    where.status = String(status);
  } else {
    where.status = 'concluido';
  }
  try {
    const items = await prisma.maintenanceRequest.findMany({
      where,
      include: { 
        feedback: { 
          include: { 
            user: { 
              select: { firstName: true, avatarUrl: true } 
            } 
          } 
        } 
      }, 
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    console.log(`Found ${items.length} items`);
    res.json(items);
  } catch (e) {
    console.error('Error in public routes:', e);
    console.error('Error stack:', e.stack);
    res.status(500).json({ message: 'Erro ao listar serviços públicos', error: e.message });
  }
});

module.exports = router;
