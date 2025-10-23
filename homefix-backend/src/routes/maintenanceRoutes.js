const express = require('express');
const prisma = require('../prismaClient');
const { protect } = require('../middlewares/authMiddleware');
const { sendMessage, getMessages } = require('../controllers/messageController');

const router = express.Router();

// GET all requests (admin or technician). Supports optional ?status=
router.get('/', protect, async (req, res) => {
  const canListAll = req.user.isAdmin === true || req.user.isTechnician === true;
  if (!canListAll) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  const where = {};
  if (req.query.status) {
    where.status = req.query.status.toString();
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where,
    include: {
      owner: true,
      technician: true,
      messages: true,
      feedback: { include: { user: { select: { firstName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

// GET my requests (client)
router.get('/mine', protect, async (req, res) => {
  const requests = await prisma.maintenanceRequest.findMany({
    where: { ownerId: req.user.id },
    include: {
      owner: true,
      technician: true,
      messages: true,
      feedback: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

// Create new request
router.post('/', protect, async (req, res) => {
  const { title, description, category, price, scheduledAt, status } = req.body;
  const errors = {};
  if (!title || !title.trim()) errors.title = 'Indique o titulo';
  if (!description || !description.trim()) errors.description = 'Indique a descricao';
  if (!category || !category.trim()) errors.category = 'Selecione a categoria';
  if (price !== undefined && price !== null && Number.isNaN(Number(price))) {
    errors.price = 'Preco deve ser numerico';
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Campos invalidos', errors });
  }

  const request = await prisma.maintenanceRequest.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      price: price !== undefined && price !== null ? Number(price) : null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      ownerId: req.user.id,
      status: typeof status === 'string' && status.trim() ? status.trim() : 'pendente',
    },
  });
  res.status(201).json(request);
});

// GET by id
router.get('/:id', protect, async (req, res) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    include: {
      owner: true,
      technician: true,
      messages: true,
      feedback: { include: { user: { select: { firstName: true } } } },
    },
  });
  if (!request) {
    return res.status(404).json({ message: 'Nao encontrado' });
  }
  const isOwner = request.ownerId === req.user.id;
  const isAssignedTech = request.technicianId && request.technicianId === req.user.id;
  if (!(req.user.isAdmin === true || isOwner || isAssignedTech)) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  res.json(request);
});

// Update
router.put('/:id', protect, async (req, res) => {
  const { title, description, category, price, status, techId, technicianId, scheduledAt } = req.body;
  const updated = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data: {
      title,
      description,
      category,
      price,
      status,
      technicianId: technicianId || techId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
  });
  res.json(updated);
});

// Delete
router.delete('/:id', protect, async (req, res) => {
  await prisma.maintenanceRequest.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Messages for a maintenance request
router.get('/:id/messages', protect, getMessages);
router.post('/:id/messages', protect, sendMessage);

module.exports = router;
