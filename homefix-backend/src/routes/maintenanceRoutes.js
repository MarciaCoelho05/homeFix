const express = require('express');
const prisma = require('../prismaClient');
const { protect } = require('../middlewares/authMiddleware');
const mailer = require('../config/email');
const { generateInvoicePDF } = require('../utils/pdf');
const { getBaseEmailTemplate } = require('../utils/emailTemplates');

const router = express.Router();

// Obter todos os pedidos (administrador ou técnico)
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
    const technicianCategories = Array.isArray(req.user.technicianCategory) 
      ? req.user.technicianCategory 
      : req.user.technicianCategory ? [req.user.technicianCategory] : [];
    const hasSpecificCategories = technicianCategories.length > 0 && 
                                  !technicianCategories.some(cat => 
                                    cat && (cat.toLowerCase() === 'outros' || cat.toLowerCase() === 'other')
                                  );

    const baseFilter = {
      OR: [
        { technicianId: req.user.id },
        hasSpecificCategories 
          ? { technicianId: null, status: 'pendente', category: { in: technicianCategories } }
          : { technicianId: null, status: 'pendente' },
      ],
    };

    if (req.query.status) {
      const status = req.query.status.toString();
      baseFilter.OR = [
        { technicianId: req.user.id, status },
        hasSpecificCategories 
          ? { technicianId: null, status, category: { in: technicianCategories } }
          : { technicianId: null, status },
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

// Obter os meus pedidos (cliente)
router.get('/mine', protect, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilizador não autenticado' });
    }
    
  const requests = await prisma.maintenanceRequest.findMany({
    where: { ownerId: req.user.id },
    include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        technician: { select: { id: true, firstName: true, lastName: true, email: true } },
        messages: true,
        feedback: { 
          select: { 
            id: true, 
            rating: true, 
            comment: true, 
            createdAt: true, 
            userId: true 
          } 
        },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
  } catch (err) {
    console.error('Erro ao obter pedidos do usuário:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Erro ao carregar pedidos', error: err.message });
  }
});

// Criar novo pedido
router.post('/', protect, async (req, res) => {
  const { title, description, category, price, scheduledAt, status, mediaUrls } = req.body;
  const errors = {};
  if (!title || !title.trim()) errors.title = 'Indique o título';
  if (!description || !description.trim()) errors.description = 'Indique a descrição';
  if (!category || !category.trim()) errors.category = 'Selecione a categoria';
  if (price !== undefined && price !== null && Number.isNaN(Number(price))) {
    errors.price = 'Preço deve ser numérico';
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Campos inválidos', errors });
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
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  res.status(201).json(request);
  
  // Notificar técnicos sobre o novo pedido
  notifyTechniciansAboutRequest(request, req.user.id).catch((err) => {
    console.error('Erro ao notificar técnicos:', err);
  });
  
  // Enviar email de confirmação ao cliente (usar request.owner que vem do include)
  if (request.owner && request.owner.email) {
    notifyClientAboutRequestCreated(request, request.owner).catch((err) => {
      console.error('Erro ao enviar email de confirmação ao cliente:', err);
    });
  }
});

// Obter por ID
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
    return res.status(404).json({ message: 'Não encontrado' });
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
    return res.status(404).json({ message: 'Pedido não encontrado' });
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
    return res.status(400).json({ message: 'Pedido ainda não foi concluído.' });
  }

  const buffer = await generateInvoicePDF(request, request.owner);
  const fileName = `fatura-${request.id}.pdf`;

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`,
  });
  res.send(buffer);
});

// Atualizar
router.put('/:id', protect, async (req, res) => {
  const { title, description, category, price, status, techId, technicianId, scheduledAt, mediaUrls } = req.body;
  const existing = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    select: { ownerId: true, technicianId: true },
  });

  if (!existing) {
    return res.status(404).json({ message: 'Pedido não encontrado' });
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

// Eliminar
router.delete('/:id', protect, async (req, res) => {
  const isAdmin = req.user.isAdmin === true;
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      technician: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  if (!request) {
    return res.status(404).json({ message: 'Pedido não encontrado' });
  }
  if (!(isAdmin || request.ownerId === req.user.id)) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { requestId: req.params.id } }),
    prisma.feedback.deleteMany({ where: { requestId: req.params.id } }),
    prisma.maintenanceRequest.delete({ where: { id: req.params.id } }),
  ]);

  if (request.owner && request.owner.email) {
    const ownerName = `${request.owner.firstName || ''} ${request.owner.lastName || ''}`.trim() || 'Cliente';
    
    const text = [
      `Olá ${ownerName},`,
      '',
      'Informamos que o seu pedido de serviço foi eliminado.',
      '',
      `Pedido: ${request.title}`,
      `Categoria: ${request.category || '-'}`,
      `Estado: ${request.status || 'pendente'}`,
      '',
      'Se tiver alguma dúvida, entre em contacto connosco através da aplicação.',
      '',
      'Atenciosamente,',
      'Equipa HomeFix'
    ].join('\n');

    const template = getBaseEmailTemplate('#dc3545');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${template.styles}</style>
      </head>
      <body>
        <div class="container">
          ${template.header('Pedido Eliminado')}
          <div class="content">
            <p>Olá <strong>${ownerName}</strong>,</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>🗑️ Pedido eliminado</strong></p>
              <p style="margin: 8px 0 0 0;">Informamos que o seu pedido de serviço foi eliminado.</p>
            </div>
            
            <div class="details">
              <h3>Detalhes do Pedido</h3>
              <ul>
                <li><strong>Serviço:</strong> ${request.title}</li>
                <li><strong>Categoria:</strong> ${request.category || '-'}</li>
                <li><strong>Estado:</strong> ${request.status || 'pendente'}</li>
                ${request.description ? `<li><strong>Descrição:</strong> ${request.description.substring(0, 100)}${request.description.length > 100 ? '...' : ''}</li>` : ''}
              </ul>
            </div>
            
            <p>Se tiver alguma dúvida ou precisar de ajuda, não hesite em contactar-nos através da aplicação.</p>
            
            ${template.footer()}
          </div>
        </div>
      </body>
      </html>
    `;

    mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: request.owner.email,
      subject: 'Pedido eliminado - HomeFix',
      text,
      html,
    }).catch((err) => {
      console.error('Erro ao enviar email de eliminação de pedido:', err);
    });
  }

  if (request.technician && request.technician.email) {
    const techName = `${request.technician.firstName || ''} ${request.technician.lastName || ''}`.trim() || 'Técnico';
    
    const text = [
      `Olá ${techName},`,
      '',
      'Informamos que um pedido que estava atribuído a si foi eliminado.',
      '',
      `Pedido: ${request.title}`,
      `Categoria: ${request.category || '-'}`,
      '',
      'Atenciosamente,',
      'Equipa HomeFix'
    ].join('\n');

    const template = getBaseEmailTemplate('#dc3545');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${template.styles}</style>
      </head>
      <body>
        <div class="container">
          ${template.header('Pedido Eliminado')}
          <div class="content">
            <p>Olá <strong>${techName}</strong>,</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>🗑️ Pedido eliminado</strong></p>
              <p style="margin: 8px 0 0 0;">Um pedido atribuído a si foi eliminado.</p>
            </div>
            
            <div class="details">
              <h3>Detalhes</h3>
              <ul>
                <li><strong>Serviço:</strong> ${request.title}</li>
                <li><strong>Categoria:</strong> ${request.category || '-'}</li>
              </ul>
            </div>
            
            ${template.footer()}
          </div>
        </div>
      </body>
      </html>
    `;

    mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: request.technician.email,
      subject: 'Pedido eliminado - HomeFix',
      text,
      html,
    }).catch((err) => {
      console.error('Erro ao enviar email de eliminação de pedido ao técnico:', err);
    });
  }

  res.status(204).send();
});

router.post('/:id/accept', protect, async (req, res) => {
  if (req.user.isTechnician !== true) {
    return res.status(403).json({ message: 'Apenas técnicos podem aceitar pedidos.' });
  }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
  });

  if (!request) {
    return res.status(404).json({ message: 'Pedido não encontrado' });
  }

  if (request.technicianId && request.technicianId !== req.user.id) {
    return res.status(409).json({ message: 'O pedido já foi atribuído a outro técnico.' });
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
    console.error('Erro ao enviar email de confirmação de pedido:', error)
  );
});

router.post('/:id/decline', protect, async (req, res) => {
  if (req.user.isTechnician !== true) {
    return res.status(403).json({ message: 'Apenas técnicos podem recusar pedidos.' });
  }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
  });

  if (!request) {
    return res.status(404).json({ message: 'Pedido não encontrado' });
  }

  if (request.technicianId && request.technicianId !== req.user.id) {
    return res.status(409).json({ message: 'O pedido pertence a outro técnico.' });
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
      owner: { select: { id: true, firstName: true, lastName: true, email: true, nif: true } },
      technician: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!request) {
    return res.status(404).json({ message: 'Pedido não encontrado' });
  }

  const isAdmin = req.user.isAdmin === true;
  const isAssignedTech = request.technicianId && request.technicianId === req.user.id;

  if (!(isAdmin || isAssignedTech)) {
    return res.status(403).json({ message: 'Apenas o técnico atribuído ou o administrador podem concluir o pedido.' });
  }

  const updated = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data: {
      status: 'concluido',
      completedAt: new Date(),
    },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true, nif: true } },
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
    message: 'Pedido marcado como concluído.',
    request: updated,
    invoice: invoiceBase64,
    fileName,
  });
  
  // Enviar email de conclusão com fatura ao cliente
  notifyClientAboutRequestCompleted(updated, invoiceBase64, fileName).catch((err) => {
    console.error('Erro ao enviar email de conclusão ao cliente:', err);
  });
});

// Adicionar/atualizar preço do serviço (apenas para técnico atribuído)
router.patch('/:id/price', protect, async (req, res) => {
  try {
    const { price } = req.body;
    
    if (price === undefined || price === null || price === '') {
      return res.status(400).json({ message: 'Preço é obrigatório' });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: 'Preço inválido' });
    }

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: req.params.id },
      select: { technicianId: true, ownerId: true },
    });

    if (!request) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    const isAssignedTech = request.technicianId && request.technicianId === req.user.id;
    const isAdmin = req.user.isAdmin === true;

    if (!(isAdmin || isAssignedTech)) {
      return res.status(403).json({ message: 'Apenas o técnico atribuído pode definir o preço' });
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id: req.params.id },
      data: { price: numericPrice },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        technician: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar preço:', error);
    res.status(500).json({ message: 'Erro ao atualizar preço' });
  }
});

// Criar feedback (apenas para cliente que criou o pedido)
router.post('/:id/feedback', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Avaliação deve ser entre 1 e 5' });
    }

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: req.params.id },
      select: { 
        ownerId: true, 
        status: true,
        feedback: { select: { id: true, userId: true } }
      },
    });

    if (!request) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    const isOwner = request.ownerId === req.user.id;
    const isAdmin = req.user.isAdmin === true;

    if (!(isAdmin || isOwner)) {
      return res.status(403).json({ message: 'Apenas o cliente pode deixar feedback' });
    }

    if (request.status !== 'concluido') {
      return res.status(400).json({ message: 'Só pode deixar feedback em pedidos concluídos' });
    }

    const existingFeedback = request.feedback || null;
    
    let feedback;
    if (existingFeedback) {
      // Atualizar feedback existente
      feedback = await prisma.feedback.update({
        where: { id: existingFeedback.id },
        data: {
          rating: Number(rating),
          comment: comment || '',
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      });
    } else {
      // Criar novo feedback
      feedback = await prisma.feedback.create({
        data: {
          rating: Number(rating),
          comment: comment || '',
          userId: req.user.id,
          requestId: req.params.id,
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      });
    }

    res.json({ message: 'Feedback enviado com sucesso', feedback });
  } catch (error) {
    console.error('Erro ao criar feedback:', error);
    res.status(500).json({ message: 'Erro ao enviar feedback' });
  }
});

module.exports = router;

async function notifyClientAboutRequestCreated(request, owner) {
  try {
    if (!owner || !owner.email) {
      console.log('Cliente sem email, não é possível enviar confirmação');
      return;
    }

    const userName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Cliente';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const chatLink = `${appUrl}/chat?requestId=${request.id}`;
    const dashboardLink = `${appUrl}/dashboard`;

    const text = [
      `Olá ${userName},`,
      '',
      'Recebemos o seu pedido de serviço na HomeFix!',
      '',
      `Título: ${request.title}`,
      `Categoria: ${request.category}`,
      request.scheduledAt ? `Data preferencial: ${new Date(request.scheduledAt).toLocaleString('pt-PT')}` : '',
      request.price != null ? `Preço indicado: EUR ${Number(request.price).toFixed(2)}` : '',
      '',
      `Descrição: ${request.description}`,
      '',
      'O seu pedido está em análise e será atribuído a um técnico qualificado em breve.',
      '',
      'Pode acompanhar o estado do pedido e manter contacto com o técnico através do chat na aplicação:',
      chatLink,
      '',
      'Atenciosamente,',
      'Equipa HomeFix'
    ].filter(Boolean).join('\n');

    const template = getBaseEmailTemplate();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${template.styles}</style>
      </head>
      <body>
        <div class="container">
          ${template.header('HomeFix - Pedido Confirmado')}
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>✅ Pedido recebido com sucesso!</strong></p>
              <p style="margin: 8px 0 0 0;">Recebemos o seu pedido de serviço e está em análise.</p>
            </div>
            
            <div class="details">
              <h3>${request.title}</h3>
              <ul>
                <li><strong>Categoria:</strong> ${request.category}</li>
                ${request.scheduledAt ? `<li><strong>Data preferencial:</strong> ${new Date(request.scheduledAt).toLocaleString('pt-PT')}</li>` : ''}
                ${request.price != null ? `<li><strong>Preço indicado:</strong> EUR ${Number(request.price).toFixed(2)}</li>` : ''}
              </ul>
              
              <p><strong>Descrição:</strong></p>
              <div class="highlight">${request.description || '-'}</div>
            </div>
            
            <p>O seu pedido será atribuído a um técnico qualificado em breve. Assim que um técnico aceitar o pedido, poderá manter contacto através do chat na aplicação.</p>
            
            <p style="text-align: center;">
              <a href="${chatLink}" class="button">Abrir Chat</a>
              <a href="${dashboardLink}" class="button" style="background-color: #6c757d; margin-left: 10px;">Ver Meus Pedidos</a>
            </p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>💬 Mantenha contacto:</strong></p>
              <p style="margin: 8px 0 0 0;">Após a atribuição do técnico, pode usar o chat da aplicação para comunicar diretamente, esclarecer dúvidas e acompanhar o progresso do serviço.</p>
            </div>
            
            ${template.footer()}
          </div>
        </div>
      </body>
      </html>
    `;

    await mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: owner.email,
      subject: `Pedido confirmado: ${request.title} - HomeFix`,
      text,
      html,
    });
    
    console.log(`✅ Email de confirmação de pedido enviado para ${owner.email}`);
  } catch (error) {
    console.error('Erro ao enviar email de confirmação ao cliente:', error);
  }
}

async function notifyClientAboutRequestCompleted(request, invoiceBase64, fileName) {
  try {
    console.log('📧 Preparando email de conclusão...');
    console.log('  - Tem invoiceBase64?', !!invoiceBase64, 'Tamanho:', invoiceBase64 ? invoiceBase64.length : 0);
    console.log('  - Nome do ficheiro:', fileName);
    
    if (!request.owner || !request.owner.email) {
      console.log('⚠️ Cliente sem email, não é possível enviar email de conclusão');
      return;
    }

    const userName = `${request.owner.firstName || ''} ${request.owner.lastName || ''}`.trim() || 'Cliente';
    const technicianName = request.technician
      ? `${request.technician.firstName || ''} ${request.technician.lastName || ''}`.trim() || request.technician.email
      : 'Técnico';
    
    const IVA_RATE = 0.23;
    const basePrice = Number(request.price) || 0;
    const totalPrice = basePrice + (basePrice * IVA_RATE);
    
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const feedbackLink = `${appUrl}/dashboard`;

    const text = [
      `Olá ${userName},`,
      '',
      'O seu pedido de serviço foi concluído com sucesso!',
      '',
      `Título: ${request.title}`,
      `Categoria: ${request.category}`,
      request.technician ? `Técnico: ${technicianName}` : '',
      request.price != null ? `Preço (IVA incluído): EUR ${totalPrice.toFixed(2)}` : '',
      request.completedAt ? `Concluído em: ${new Date(request.completedAt).toLocaleString('pt-PT')}` : '',
      '',
      'Agradecemos a sua confiança na HomeFix!',
      '',
      'Se tiver alguma questão ou desejar deixar feedback, pode fazê-lo através da aplicação.',
      '',
      'Atenciosamente,',
      'Equipa HomeFix'
    ].filter(Boolean).join('\n');

    const template = getBaseEmailTemplate('#28a745');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${template.styles}</style>
      </head>
      <body>
        <div class="container">
          ${template.header('HomeFix - Serviço Concluído')}
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="success-box">
              <p style="margin: 0;"><strong>✅ Serviço concluído com sucesso!</strong></p>
              <p style="margin: 8px 0 0 0;">O seu pedido foi concluído pelo técnico.</p>
            </div>
            
            <div class="details">
              <h3>${request.title}</h3>
              <ul>
                <li><strong>Categoria:</strong> ${request.category}</li>
                ${request.technician ? `<li><strong>Técnico:</strong> ${technicianName}</li>` : ''}
                ${request.price != null ? `<li><strong>Preço (IVA incluído):</strong> EUR ${totalPrice.toFixed(2)}</li>` : ''}
                ${request.completedAt ? `<li><strong>Concluído em:</strong> ${new Date(request.completedAt).toLocaleString('pt-PT')}</li>` : ''}
              </ul>
            </div>
            
            <p>Agradecemos a sua confiança na HomeFix! Esperamos que tenha ficado satisfeito com o serviço prestado.</p>
            
            <p style="text-align: center;">
              <a href="${feedbackLink}" class="button">Deixar Feedback</a>
            </p>
            
            <p>Se tiver alguma questão ou precisar de esclarecimentos, pode contactar-nos através da aplicação.</p>
            
            ${template.footer()}
          </div>
        </div>
      </body>
      </html>
    `;

    const attachments = [];
    if (invoiceBase64 && fileName) {
      attachments.push({
        filename: fileName,
        content: invoiceBase64,
        encoding: 'base64',
        contentType: 'application/pdf',
      });
      console.log(`✅ Anexo adicionado: ${fileName} (${Math.round(invoiceBase64.length / 1024)}KB)`);
    } else {
      console.log('⚠️ AVISO: PDF não será anexado - invoiceBase64 ou fileName ausentes');
    }

    console.log(`📤 Enviando email com ${attachments.length} anexo(s) para ${request.owner.email}...`);

    await mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: request.owner.email,
      subject: `Serviço concluído: ${request.title} - HomeFix`,
      text,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    
    console.log(`✅ Email de conclusão COM fatura enviado para ${request.owner.email}`);
  } catch (error) {
    console.error('Erro ao enviar email de conclusão ao cliente:', error);
  }
}

async function notifyTechniciansAboutRequest(request, ownerId) {
  try {
    console.log('🔔 Notificando técnicos sobre novo pedido:', request.id, 'Categoria:', request.category);
    
    const technicians = await prisma.user.findMany({
      where: { isTechnician: true, email: { not: { equals: null } } },
      select: { email: true, firstName: true, lastName: true, technicianCategory: true },
    });
    
    console.log(`📧 Encontrados ${technicians.length} técnicos para notificar`);
    
    if (technicians.length === 0) {
      console.log('⚠️ Nenhum técnico com email encontrado');
      return;
    }

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { firstName: true, lastName: true, email: true },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const requestLink = `${appUrl}/dashboard`;
    const mediaSection = request.mediaUrls && request.mediaUrls.length
      ? `<p><strong>📎 Anexos:</strong></p><ul>${request.mediaUrls.map((url) => `<li><a href="${url}" style="color: #ff7a00;">${url}</a></li>`).join('')}</ul>`
      : '';

    const ownerName = owner 
      ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email || 'Cliente'
      : 'Cliente';

    const template = getBaseEmailTemplate();

    // Enviar email personalizado para cada técnico
    const emailPromises = technicians.map(async (technician) => {
      const technicianName = `${technician.firstName || ''} ${technician.lastName || ''}`.trim() || 'Técnico';
      
      const technicianCategories = Array.isArray(technician.technicianCategory) 
        ? technician.technicianCategory 
        : technician.technicianCategory ? [technician.technicianCategory] : [];
      
      const isRelevantCategory = technicianCategories.length > 0 && 
        technicianCategories.some(cat => 
          cat && cat.toLowerCase() === request.category?.toLowerCase()
        );
      
      const matchingCategory = technicianCategories.find(cat => 
        cat && cat.toLowerCase() === request.category?.toLowerCase()
      );
      
      console.log(`  → Técnico: ${technicianName} (${technician.email}) - Especializações: ${technicianCategories.join(', ') || 'Nenhuma'} - Match: ${isRelevantCategory ? `SIM ✅ (${matchingCategory})` : 'NÃO'}`);
      
      const categoryMessage = isRelevantCategory
        ? `<div class="info-box">
             <p style="margin: 0;"><strong>✨ Este pedido corresponde à sua especialização (${matchingCategory})!</strong></p>
             <p style="margin: 8px 0 0 0;">Você é especialista nesta categoria.</p>
           </div>`
      : '';

    const text = [
        `Olá ${technicianName},`,
        '',
        'Existe um novo pedido de orçamento disponível no HomeFix que pode ser do seu interesse.',
        '',
      `Título: ${request.title}`,
      `Categoria: ${request.category}`,
        isRelevantCategory ? `✨ (Corresponde à sua especialização: ${matchingCategory})` : '',
        `Cliente: ${ownerName}${owner?.email ? ` (${owner.email})` : ''}`,
        request.scheduledAt ? `Data preferencial: ${new Date(request.scheduledAt).toLocaleString('pt-PT')}` : '',
        '',
      `Descrição: ${request.description}`,
        '',
      mediaSection ? 'Existem anexos associados ao pedido.' : '',
        '',
        `Pode revisar e responder ao pedido em: ${requestLink}`,
        '',
        'Atenciosamente,',
        'Equipa HomeFix'
    ].filter(Boolean).join('\n');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>${template.styles}</style>
        </head>
        <body>
          <div class="container">
            ${template.header('HomeFix - Novo Pedido Disponível')}
            <div class="content">
              <p>Olá <strong>${technicianName}</strong>,</p>
              
              <p>Existe um novo pedido de orçamento disponível no HomeFix que pode ser do seu interesse.</p>
              
              ${categoryMessage}
              
              <div class="details">
                <h3>${request.title}</h3>
                <ul>
        <li><strong>Categoria:</strong> ${request.category}</li>
                  ${owner ? `<li><strong>Cliente:</strong> ${ownerName}${owner.email ? ` (${owner.email})` : ''}</li>` : ''}
                  ${request.scheduledAt ? `<li><strong>Data preferencial:</strong> ${new Date(request.scheduledAt).toLocaleString('pt-PT')}</li>` : ''}
                  ${request.price != null ? `<li><strong>Preço indicado:</strong> EUR ${Number(request.price).toFixed(2)}</li>` : ''}
      </ul>
                
      <p><strong>Descrição:</strong></p>
                <div class="highlight">${request.description || '-'}</div>
                
      ${mediaSection}
              </div>
              
              <p style="text-align: center;">
                <a href="${requestLink}" class="button">Ver Pedido no Dashboard</a>
              </p>
              
              ${template.footer()}
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const result = await mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
          to: technician.email,
          subject: `${isRelevantCategory ? '⭐ ' : ''}Novo pedido: ${request.title}${isRelevantCategory ? ' (Relevante para si)' : ''}`,
      text,
      html,
        });
        
        console.log(`✅ Email enviado para ${technician.email} (${result.messageId})`);
        return { success: true, email: technician.email, isRelevant: isRelevantCategory };
      } catch (emailError) {
        console.error(`❌ Erro ao enviar email para ${technician.email}:`, emailError);
        return { success: false, email: technician.email, error: emailError.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const relevant = results.filter(r => r.success && r.isRelevant).length;
    
    console.log(`📊 Resumo: ${successful} emails enviados (${relevant} para especialistas da categoria), ${failed} falharam`);
    
    if (failed > 0) {
      console.error('❌ Emails que falharam:', results.filter(r => !r.success));
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email de pedido:', error);
    console.error('Detalhes do erro:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function notifyAcceptance(request) {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const chatLink = `${appUrl}/chat?requestId=${request.id}`;
    const dashboardLink = `${appUrl}/dashboard`;
    const template = getBaseEmailTemplate('#28a745');

    // Email para o técnico
    if (request.technician?.email) {
      const technicianName = [request.technician.firstName, request.technician.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || 'técnico';

      const textTech = [
        `Olá ${technicianName},`,
        '',
        `Confirmamos que aceitou o pedido "${request.title}" (${request.category}).`,
        '',
        'Pode falar com o cliente e acompanhar o trabalho através do painel.',
        '',
        `Link para chat: ${chatLink}`,
        `Link para dashboard: ${dashboardLink}`,
        '',
        'Atenciosamente,',
        'Equipa HomeFix'
      ].join('\n');

      const htmlTech = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>${template.styles}</style>
        </head>
        <body>
          <div class="container">
            ${template.header('HomeFix - Pedido Aceite')}
            <div class="content">
              <p>Olá <strong>${technicianName}</strong>,</p>
              
              <div class="success-box">
                <p style="margin: 0;"><strong>✅ Pedido aceite com sucesso!</strong></p>
                <p style="margin: 8px 0 0 0;">Confirmamos que aceitou o seguinte pedido:</p>
              </div>
              
              <div class="details">
                <h3>${request.title}</h3>
                <ul>
                  <li><strong>Categoria:</strong> ${request.category}</li>
                  ${request.scheduledAt ? `<li><strong>Data preferencial:</strong> ${new Date(request.scheduledAt).toLocaleString('pt-PT')}</li>` : ''}
                </ul>
              </div>
              
              <p>Pode falar com o cliente e acompanhar o trabalho através do painel.</p>
              
              <p style="text-align: center;">
                <a href="${chatLink}" class="button">Abrir Chat com Cliente</a>
              </p>
              
              <p style="text-align: center;">
                <a href="${dashboardLink}" style="color: #ff7a00;">Ver Pedidos Atribuídos</a>
              </p>
              
              ${template.footer()}
            </div>
          </div>
        </body>
        </html>
      `;

      await mailer.sendMail({
        from: '"HomeFix" <no-reply@homefix.com>',
        to: request.technician.email,
        subject: `Pedido aceite: ${request.title} - HomeFix`,
        text: textTech,
        html: htmlTech,
      });
    }

    // Email para o cliente
    if (request.owner?.email && request.technician?.email) {
      const ownerName = [request.owner.firstName, request.owner.lastName].filter(Boolean).join(' ').trim() || 'cliente';
      const technicianName = [request.technician.firstName, request.technician.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || request.technician.email;

      const textOwner = [
        `Olá ${ownerName},`,
        '',
        `O técnico ${technicianName} aceitou o seu pedido "${request.title}".`,
        '',
        'Poderá acompanhar o estado do trabalho e conversar com o técnico através da plataforma.',
        '',
        `Link para chat: ${chatLink}`,
        `Link para dashboard: ${dashboardLink}`,
        '',
        'Atenciosamente,',
        'Equipa HomeFix'
      ].join('\n');

      const htmlOwner = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>${template.styles}</style>
        </head>
        <body>
          <div class="container">
            ${template.header('HomeFix - Pedido Aceite')}
            <div class="content">
              <p>Olá <strong>${ownerName}</strong>,</p>
              
              <div class="success-box">
                <p style="margin: 0;"><strong>🎉 Ótimas notícias!</strong></p>
                <p style="margin: 8px 0 0 0;">O seu pedido foi aceite por um técnico.</p>
              </div>
              
              <div class="details">
                <h3>${request.title}</h3>
                <ul>
                  <li><strong>Categoria:</strong> ${request.category}</li>
                  <li><strong>Técnico:</strong> ${technicianName}</li>
                  ${request.scheduledAt ? `<li><strong>Data preferencial:</strong> ${new Date(request.scheduledAt).toLocaleString('pt-PT')}</li>` : ''}
                </ul>
              </div>
              
              <p>Poderá acompanhar o estado do trabalho e conversar com o técnico através da plataforma.</p>
              
              <p style="text-align: center;">
                <a href="${chatLink}" class="button">Abrir Chat com Técnico</a>
              </p>
              
              <p style="text-align: center;">
                <a href="${dashboardLink}" style="color: #ff7a00;">Ver Meus Pedidos</a>
              </p>
              
              ${template.footer()}
            </div>
          </div>
        </body>
        </html>
      `;

      await mailer.sendMail({
        from: '"HomeFix" <no-reply@homefix.com>',
        to: request.owner.email,
        subject: `O seu pedido foi aceite: ${request.title} - HomeFix`,
        text: textOwner,
        html: htmlOwner,
      });
    }
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
  }
}

