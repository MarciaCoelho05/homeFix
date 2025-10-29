const express = require('express');
const prisma = require('../prismaClient');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

async function canAccessRequest(user, request) {
  if (!request) return false;
  if (user.isAdmin === true) return true;
  if (request.ownerId === user.id) return true;
  if (request.technicianId && request.technicianId === user.id) return true;
  return false;
}

router.get('/:requestId', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilizador não autenticado' });
    }
    
    const { requestId } = req.params;
    if (!requestId) {
      return res.status(400).json({ message: 'requestId é obrigatório' });
    }
    
    const request = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    if (!(await canAccessRequest(req.user, request))) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    
    const messages = await prisma.message.findMany({
      where: { requestId },
      include: {
        sender: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (err) {
    console.error('Erro ao obter mensagens:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Erro ao carregar mensagens', error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { requestId, content, attachments } = req.body || {};
  if (!requestId) {
    return res.status(400).json({ message: 'requestId é obrigatório.' });
  }

  const text = typeof content === 'string' ? content.trim() : '';
  const files = Array.isArray(attachments)
    ? attachments
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

  if (!text && files.length === 0) {
    return res.status(400).json({ message: 'Indique uma mensagem ou anexos.' });
  }

  const request = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } });
  if (!(await canAccessRequest(req.user, request))) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  const message = await prisma.message.create({
    data: {
      content: text,
      attachments: files,
      senderId: req.user.id,
      requestId,
    },
    include: {
      sender: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  res.status(201).json(message);
});

router.delete('/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, requestId: true },
  });

  if (!message) {
    return res.status(404).json({ message: 'Mensagem não encontrada' });
  }

  if (!(req.user.isAdmin === true || message.senderId === req.user.id)) {
    return res.status(403).json({ message: 'Apenas o autor pode eliminar esta mensagem.' });
  }

  await prisma.message.delete({ where: { id: messageId } });
  res.status(204).send();
});

module.exports = router;
