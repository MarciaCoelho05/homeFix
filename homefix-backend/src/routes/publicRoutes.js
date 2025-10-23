const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

router.get('/requests', async (req, res) => {
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
      include: { feedback: { include: { user: { select: { firstName: true, avatarUrl: true } } } } }, orderBy: { createdAt: 'desc' },
      take: 30
    });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar serviços públicos' });
  }
});

module.exports = router;

