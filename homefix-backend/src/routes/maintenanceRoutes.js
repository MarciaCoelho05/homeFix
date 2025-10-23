const express = require('express');
const prisma = require('../prismaClient');
const { protect } = require('../middlewares/authMiddleware');
const { sendMessage, getMessages } = require('../controllers/messageController');
const mailer = require('../config/email');

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
  const { title, description, category, price, scheduledAt, status, mediaUrls } = req.body;
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

  const normalizedMedia = Array.isArray(mediaUrls)
    ? mediaUrls.filter(Boolean).map((url) => url.toString())
    : mediaUrls
      ? [mediaUrls.toString()]
      : [];

  const request = await prisma.maintenanceRequest.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      price: price !== undefined && price !== null ? Number(price) : null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      ownerId: req.user.id,
      status: typeof status === 'string' && status.trim() ? status.trim() : 'pendente',
      mediaUrls: normalizedMedia,
    },
  });
  res.status(201).json(request);
  notifyTechniciansAboutRequest(request, req.user.id).catch((err) =>
    console.error('Erro ao notificar tecnicos:', err)
  );
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
  const { title, description, category, price, status, techId, technicianId, scheduledAt, mediaUrls } = req.body;
  const normalizedMedia = mediaUrls === undefined
    ? undefined
    : Array.isArray(mediaUrls)
      ? mediaUrls.filter(Boolean).map((url) => url.toString())
      : [mediaUrls.toString()];

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
      mediaUrls: normalizedMedia,
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

async function notifyTechniciansAboutRequest(request, ownerId) {
  try {
    const technicians = await prisma.user.findMany({
      where: { isTechnician: true, email: { not: null } },
      select: { email: true, firstName: true },
    });
    const recipients = technicians.map((tech) => tech.email).filter(Boolean);
    if (!recipients.length) return;

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { firstName: true, lastName: true, email: true },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const requestLink = `${appUrl}/dashboard`;
    const mediaSection = request.mediaUrls && request.mediaUrls.length
      ? `<p><strong>Anexos:</strong></p><ul>${request.mediaUrls.map((url) => `<li><a href="${url}">${url}</a></li>`).join('')}</ul>`
      : '';

    const text = [
      'Novo pedido de orçamento disponível no HomeFix.',
      `Título: ${request.title}`,
      `Categoria: ${request.category}`,
      owner ? `Cliente: ${owner.firstName || ''} ${owner.lastName || ''} (${owner.email || 'sem email'})` : '',
      request.scheduledAt ? `Data preferencial: ${new Date(request.scheduledAt).toLocaleString()}` : '',
      `Descrição: ${request.description}`,
      mediaSection ? 'Existem anexos associados ao pedido.' : '',
      `Revise o pedido em: ${requestLink}`,
    ].filter(Boolean).join('\n');

    const html = `
      <p>Existe um novo pedido de orçamento disponível no HomeFix.</p>
      <ul>
        <li><strong>Título:</strong> ${request.title}</li>
        <li><strong>Categoria:</strong> ${request.category}</li>
        ${owner ? `<li><strong>Cliente:</strong> ${owner.firstName || ''} ${owner.lastName || ''} (${owner.email || 'sem email'})</li>` : ''}
        ${request.scheduledAt ? `<li><strong>Data preferencial:</strong> ${new Date(request.scheduledAt).toLocaleString()}</li>` : ''}
      </ul>
      <p><strong>Descrição:</strong></p>
      <p>${request.description || '-'}</p>
      ${mediaSection}
      <p><a href="${requestLink}">Abrir painel para responder ao pedido</a></p>
    `;

    await mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: recipients,
      subject: `Novo pedido de orçamento: ${request.title}`,
      text,
      html,
    });
  } catch (error) {
    console.error('Erro ao enviar email de pedido:', error);
  }
}

