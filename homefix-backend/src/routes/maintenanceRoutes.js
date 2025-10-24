const express = require('express');
const prisma = require('../prismaClient');
const { protect } = require('../middlewares/authMiddleware');
const mailer = require('../config/email');
const { generateInvoicePDF } = require('../utils/pdf');

const router = express.Router();

// GET all requests (admin or technician)
router.get('/', protect, async (req, res) => {
  const isAdmin = req.user.isAdmin === true;
  const isTechnician = req.user.isTechnician === true;

  if (!isAdmin && !isTechnician) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  let where;
  if (isAdmin) {
    where = {};
    if (req.query.status) {
      where.status = req.query.status.toString();
    }
  } else {
    const baseFilter = {
      OR: [
        { technicianId: req.user.id },
        { technicianId: null, status: 'pendente' },
      ],
    };

    if (req.query.status) {
      const status = req.query.status.toString();
      baseFilter.OR = [
        { technicianId: req.user.id, status },
        { technicianId: null, status },
      ];
    }
    where = baseFilter;
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where,
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      technician: { select: { id: true, firstName: true, lastName: true, email: true } },
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

router.get('/:id/invoice', protect, async (req, res) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!request) {
    return res.status(404).json({ message: 'Pedido nao encontrado' });
  }

  const isAdmin = req.user.isAdmin === true;
  const isOwner = request.ownerId === req.user.id;
  const isAssignedTech = request.technicianId && request.technicianId === req.user.id;

  if (!(isAdmin || isOwner || isAssignedTech)) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  if (!request.owner) {
    return res.status(400).json({ message: 'Pedido sem cliente associado.' });
  }

  const loweredStatus = (request.status || '').toLowerCase();
  if (loweredStatus !== 'concluido' && !request.completedAt) {
    return res.status(400).json({ message: 'Pedido ainda nao foi concluido.' });
  }

  const buffer = await generateInvoicePDF(request, request.owner);
  const fileName = `fatura-${request.id}.pdf`;

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`,
  });
  res.send(buffer);
});

// Update
router.put('/:id', protect, async (req, res) => {
  const { title, description, category, price, status, techId, technicianId, scheduledAt, mediaUrls } = req.body;
  const existing = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    select: { ownerId: true, technicianId: true },
  });

  if (!existing) {
    return res.status(404).json({ message: 'Pedido nÃ£o encontrado' });
  }

  const isOwner = existing.ownerId === req.user.id;
  const isAssignedTech = existing.technicianId && existing.technicianId === req.user.id;
  const isAdmin = req.user.isAdmin === true;

  if (!(isAdmin || isOwner || isAssignedTech)) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  const normalizedMedia = mediaUrls === undefined
    ? undefined
    : Array.isArray(mediaUrls)
      ? mediaUrls.filter(Boolean).map((url) => url.toString())
      : [mediaUrls.toString()];

  const data = {
    title,
    description,
    category,
    price,
    status,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    mediaUrls: normalizedMedia,
  };

  if (isAdmin) {
    data.technicianId = technicianId || techId || null;
  }

  const updated = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data,
  });
  res.json(updated);
});

// Delete
router.delete('/:id', protect, async (req, res) => {
  const isAdmin = req.user.isAdmin === true;
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    select: { ownerId: true },
  });
  if (!request) {
    return res.status(404).json({ message: 'Pedido nÃ£o encontrado' });
  }
  if (!(isAdmin || request.ownerId === req.user.id)) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { requestId: req.params.id } }),
    prisma.feedback.deleteMany({ where: { requestId: req.params.id } }),
    prisma.maintenanceRequest.delete({ where: { id: req.params.id } }),
  ]);
  res.status(204).send();
});

router.post('/:id/accept', protect, async (req, res) => {
  if (req.user.isTechnician !== true) {
    return res.status(403).json({ message: 'Apenas tÃ©cnicos podem aceitar pedidos.' });
  }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
  });

  if (!request) {
    return res.status(404).json({ message: 'Pedido nÃ£o encontrado' });
  }

  if (request.technicianId && request.technicianId !== req.user.id) {
    return res.status(409).json({ message: 'O pedido jÃ¡ foi atribuÃ­do a outro tÃ©cnico.' });
  }

  const updated = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data: {
      technicianId: req.user.id,
      status: req.body?.status?.toString() || 'em_progresso',
    },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      technician: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  res.json(updated);
  notifyAcceptance(updated).catch((error) =>
    console.error('Erro ao enviar email de confirmaÃ§Ã£o de pedido:', error)
  );
});

router.post('/:id/decline', protect, async (req, res) => {
  if (req.user.isTechnician !== true) {
    return res.status(403).json({ message: 'Apenas tÃ©cnicos podem recusar pedidos.' });
  }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
  });

  if (!request) {
    return res.status(404).json({ message: 'Pedido nÃ£o encontrado' });
  }

  if (request.technicianId && request.technicianId !== req.user.id) {
    return res.status(409).json({ message: 'O pedido pertence a outro tÃ©cnico.' });
  }

  const updated = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data: {
      technicianId: null,
      status: 'pendente',
    },
  });

  res.json(updated);
});

router.post('/:id/complete', protect, async (req, res) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      technician: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!request) {
    return res.status(404).json({ message: 'Pedido nÃ£o encontrado' });
  }

  const isAdmin = req.user.isAdmin === true;
  const isAssignedTech = request.technicianId && request.technicianId === req.user.id;

  if (!(isAdmin || isAssignedTech)) {
    return res.status(403).json({ message: 'Apenas o tÃ©cnico atribuÃ­do ou o administrador podem concluir o pedido.' });
  }

  const updated = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data: {
      status: 'concluido',
      completedAt: new Date(),
    },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      technician: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  let invoiceBase64 = null;
  let fileName = null;
  if (updated.owner) {
    const buffer = await generateInvoicePDF(updated, updated.owner);
    invoiceBase64 = buffer.toString('base64');
    fileName = `fatura-${updated.id}.pdf`;
  }

  res.json({
    message: 'Pedido marcado como concluido.',
    request: updated,
    invoice: invoiceBase64,
    fileName,
  });
});

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
      'Novo pedido de orÃ§amento disponÃ­vel no HomeFix.',
      `TÃ­tulo: ${request.title}`,
      `Categoria: ${request.category}`,
      owner ? `Cliente: ${owner.firstName || ''} ${owner.lastName || ''} (${owner.email || 'sem email'})` : '',
      request.scheduledAt ? `Data preferencial: ${new Date(request.scheduledAt).toLocaleString()}` : '',
      `DescriÃ§Ã£o: ${request.description}`,
      mediaSection ? 'Existem anexos associados ao pedido.' : '',
      `Revise o pedido em: ${requestLink}`,
    ].filter(Boolean).join('\n');

    const html = `
      <p>Existe um novo pedido de orÃ§amento disponÃ­vel no HomeFix.</p>
      <ul>
        <li><strong>TÃ­tulo:</strong> ${request.title}</li>
        <li><strong>Categoria:</strong> ${request.category}</li>
        ${owner ? `<li><strong>Cliente:</strong> ${owner.firstName || ''} ${owner.lastName || ''} (${owner.email || 'sem email'})</li>` : ''}
        ${request.scheduledAt ? `<li><strong>Data preferencial:</strong> ${new Date(request.scheduledAt).toLocaleString()}</li>` : ''}
      </ul>
      <p><strong>DescriÃ§Ã£o:</strong></p>
      <p>${request.description || '-'}</p>
      ${mediaSection}
      <p><a href="${requestLink}">Abrir painel para responder ao pedido</a></p>
    `;

    await mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: recipients,
      subject: `Novo pedido de orÃ§amento: ${request.title}`,
      text,
      html,
    });
  } catch (error) {
    console.error('Erro ao enviar email de pedido:', error);
  }
}

async function notifyAcceptance(request) {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const chatLink = `${appUrl}/chat?requestId=${request.id}`;
    const dashboardLink = `${appUrl}/dashboard`;

    if (request.technician?.email) {
      const technicianName = [request.technician.firstName, request.technician.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      await mailer.sendMail({
        from: '"HomeFix" <no-reply@homefix.com>',
        to: request.technician.email,
        subject: `Pedido aceite: ${request.title}`,
        html: `
          <p>OlÃ¡ ${technicianName || 'tÃ©cnico'},</p>
          <p>Confirmamos que aceitaste o pedido <strong>${request.title}</strong> (${request.category}).</p>
          <p>Podes falar com o cliente e acompanhar o trabalho atravÃ©s do painel.</p>
          <p><a href="${chatLink}">Abrir chat com o cliente</a></p>
          <p><a href="${dashboardLink}">Ver pedidos atribuÃ­dos</a></p>
        `,
      });
    }

    if (request.owner?.email && request.technician?.email) {
      const ownerName = [request.owner.firstName, request.owner.lastName].filter(Boolean).join(' ').trim();
      const technicianName = [request.technician.firstName, request.technician.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      await mailer.sendMail({
        from: '"HomeFix" <no-reply@homefix.com>',
        to: request.owner.email,
        subject: `O seu pedido foi aceite: ${request.title}`,
        html: `
          <p>OlÃ¡ ${ownerName || 'cliente'},</p>
          <p>O tÃ©cnico <strong>${technicianName || request.technician.email}</strong> aceitou o pedido <strong>${
            request.title
          }</strong>.</p>
          <p>PoderÃ¡ acompanhar o estado do trabalho e conversar com o tÃ©cnico atravÃ©s da plataforma.</p>
          <p><a href="${chatLink}">Abrir chat com o tÃ©cnico</a></p>
          <p><a href="${dashboardLink}">Ver pedidos</a></p>
        `,
      });
    }
  } catch (error) {
    console.error('Erro ao enviar email de confirmaÃ§Ã£o:', error);
  }
}

