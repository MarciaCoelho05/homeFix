const express = require('express');

let prisma;
try {
  prisma = require('../prismaClient');
} catch (error) {
  console.error('Erro ao carregar Prisma Client nas rotas públicas:', error);
  prisma = null;
}

const router = express.Router();

// CORS middleware for this router
router.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`[PUBLIC ROUTES CORS] ${req.method} ${req.path} - Origin: ${origin}`);
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

router.get('/test', (req, res) => {
  res.json({ message: 'Public routes working!' });
});

router.get('/requests', async (req, res) => {
  const origin = req.headers.origin;
  console.log(`[PUBLIC /requests] ${req.method} ${req.path} - Origin: ${origin || 'none'}`);
  
  // Ensure CORS headers are set before sending response
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  if (!prisma || !prisma.maintenanceRequest) {
    console.error('Prisma não está disponível');
    return res.status(503).json({ 
      message: 'Serviço temporariamente indisponível',
      error: 'Prisma Client não inicializado'
    });
  }
  
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
    console.log(`[PUBLIC /requests] Found ${items.length} items`);
    
    // Set CORS headers again before sending
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    res.json(items);
  } catch (e) {
    console.error('Error in public routes:', e);
    console.error('Error stack:', e.stack);
    
    // Set CORS headers even on error
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    res.status(500).json({ message: 'Erro ao listar serviços públicos', error: e.message });
  }
});

module.exports = router;
