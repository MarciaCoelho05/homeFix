const express = require('express');
const prisma = require('../prismaClient');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes protected
router.use(protect);

async function canAccessRequest(user, request) {
  if (!request) return false;
  if (user.isAdmin === true) return true;
  if (request.ownerId === user.id) return true;
  if (request.technicianId && request.technicianId === user.id) return true;
  return false;
}

// GET /api/messages/:requestId -> list messages for a maintenance request
router.get('/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const request = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } });
  if (!(await canAccessRequest(req.user, request))) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  const messages = await prisma.message.findMany({
    where: { requestId },
    include: { sender: { select: { email: true, firstName: true } } },
    orderBy: { createdAt: 'asc' }
  });
  res.json(messages);
});

// POST /api/messages -> create message { requestId, content }
router.post('/', async (req, res) => {
  const { requestId, content } = req.body;
  if (!requestId || !content) return res.status(400).json({ message: 'requestId e content são obrigatórios' });

  const request = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } });
  if (!(await canAccessRequest(req.user, request))) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  const message = await prisma.message.create({
    data: {
      content,
      senderId: req.user.id,
      requestId
    }
  });
  res.status(201).json(message);
});

module.exports = router;

