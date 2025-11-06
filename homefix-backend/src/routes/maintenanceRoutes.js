const express = require('express');
const prisma = require('../prismaClient');
const { protect } = require('../middlewares/authMiddleware');
const mailer = require('../config/email');
const { validateEmail } = require('../config/email');
const { generateInvoicePDF } = require('../utils/pdf');
const { getBaseEmailTemplate } = require('../utils/emailTemplates');

const router = express.Router();

async function sendEmailSafe(mailOptions) {
  if (!mailOptions || !mailOptions.to) {
    console.warn('[EMAIL-SAFE] Email não fornecido');
    return Promise.resolve();
  }
  
  const validation = validateEmail(mailOptions.to);
  if (!validation.valid) {
    console.warn(`[EMAIL-SAFE] ⚠️ Email bloqueado: ${mailOptions.to} - Razão: ${validation.reason}`);
    return Promise.resolve();
  }
  
  try {
    return await mailer.sendMail(mailOptions);
  } catch (err) {
    console.error(`[EMAIL-SAFE] Erro ao enviar email para ${mailOptions.to}:`, err.message);
    throw err; // Re-throw para que o caller possa tratar
  }
}

router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.isAdmin === true;
    const isTechnician = req.user.isTechnician === true;

    console.log('[REQUESTS] GET / - User:', {
      id: req.user.id,
      isAdmin,
      isTechnician,
      categories: req.user.technicianCategory
    });

    if (!isAdmin && !isTechnician) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Define variables in outer scope for use in filtering
    let technicianCategories = [];
    let hasSpecificCategories = false;

    let where;
    if (isAdmin) {
      where = {};
      if (req.query.status) {
        where.status = req.query.status.toString();
      }
    } else {
      technicianCategories = Array.isArray(req.user.technicianCategory) 
        ? req.user.technicianCategory 
        : req.user.technicianCategory ? [req.user.technicianCategory] : [];
      hasSpecificCategories = technicianCategories.length > 0 && 
                                    !technicianCategories.some(cat => 
                                      cat && (cat.toLowerCase() === 'outros' || cat.toLowerCase() === 'other')
                                    );

      console.log('[REQUESTS] Technician categories:', technicianCategories);
      console.log('[REQUESTS] Has specific categories:', hasSpecificCategories);

      // For technicians with specific categories, we'll fetch all pending requests
      // and filter by normalized category match in code to handle accent variations
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

    console.log('[REQUESTS] Query where clause:', JSON.stringify(where, null, 2));

    let requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        technician: { select: { id: true, firstName: true, lastName: true, email: true } },
        messages: true,
        feedback: { include: { user: { select: { firstName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[REQUESTS] Found', requests.length, 'requests before category filtering');

    // Additional filtering for technicians to handle category variations
    if (!isAdmin && isTechnician && hasSpecificCategories) {
      // Normalize categories for comparison (remove accents, lowercase)
      const normalizeCategory = (cat) => {
        if (!cat) return '';
        return cat.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .trim();
      };

      const normalizedTechCategories = technicianCategories.map(normalizeCategory);
      console.log('[REQUESTS] Normalized technician categories:', normalizedTechCategories);
      const technicianId = req.user.id;
      
      // Filter available requests (pendente, no technician) by normalized category match
      requests = requests.filter(req => {
        // Always include assigned requests
        if (req.technicianId === technicianId) return true;
        
        // For available requests, check normalized category match
        if (!req.technicianId && req.status === 'pendente') {
          const normalizedReqCategory = normalizeCategory(req.category);
          return normalizedTechCategories.some(techCat => 
            normalizedReqCategory === techCat || 
            normalizedReqCategory.includes(techCat) ||
            techCat.includes(normalizedReqCategory)
          );
        }
        
        return false;
      });
      
      console.log('[REQUESTS] After category normalization filter:', requests.length, 'requests');
    }

    console.log('[REQUESTS] Returning', requests.length, 'requests');
    res.json(requests);
  } catch (err) {
    console.error('[REQUESTS] Error fetching requests:', err);
    console.error('[REQUESTS] Stack:', err.stack);
    res.status(500).json({ message: 'Erro ao carregar pedidos', error: err.message });
  }
});

router.get('/mine', protect, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilizador não autenticado' });
    }
    
  const requests = await prisma.maintenanceRequest.findMany({
    where: { ownerId: req.user.id },
    include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
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
      owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
    },
  });
  res.status(201).json(request);
  
  notifyTechniciansAboutRequest(request, req.user.id).catch((err) => {
    console.error('Erro ao notificar técnicos:', err);
  });
  
  if (request.owner && request.owner.email) {
    notifyClientAboutRequestCreated(request, request.owner).catch((err) => {
      console.error('Erro ao enviar email de confirmação ao cliente:', err);
    });
  }
});

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
      owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
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

router.put('/:id', protect, async (req, res) => {
  const { title, description, category, price, status, techId, technicianId, scheduledAt, mediaUrls, completedAt } = req.body;
  const existing = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      technician: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
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

  // Verificar se a data foi alterada
  const oldScheduledAt = existing.scheduledAt;
  const newScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
  const dateChanged = oldScheduledAt?.getTime() !== newScheduledAt?.getTime();
  const isTechnicianChangingDate = isAssignedTech && dateChanged && scheduledAt;

  const normalizedMedia = mediaUrls === undefined
    ? undefined
    : Array.isArray(mediaUrls)
      ? mediaUrls.filter(Boolean).map((url) => url.toString())
      : [mediaUrls.toString()];

  // Verificar se o status está sendo alterado para concluído
  const normalizedStatus = (status || '').toLowerCase().replace(/_/g, '');
  const isBeingCompleted = normalizedStatus === 'concluido' || normalizedStatus === 'completed';
  const wasCompleted = (existing.status || '').toLowerCase().replace(/_/g, '') === 'concluido' || 
                       (existing.status || '').toLowerCase().replace(/_/g, '') === 'completed';

  const data = {
    title,
    description,
    category,
    price,
    status,
    scheduledAt: newScheduledAt,
    mediaUrls: normalizedMedia,
  };

  // Se está sendo marcado como concluído e ainda não estava concluído, definir completedAt
  if (isBeingCompleted && !wasCompleted) {
    data.completedAt = completedAt ? new Date(completedAt) : new Date();
  } else if (completedAt !== undefined) {
    // Se completedAt foi explicitamente fornecido, usar esse valor
    data.completedAt = completedAt ? new Date(completedAt) : null;
  }

  if (isAdmin) {
    data.technicianId = technicianId || techId || null;
  }

  const updated = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data,
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      technician: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Se o técnico alterou a data, notificar o cliente
  if (isTechnicianChangingDate && updated.owner) {
    notifyClientAboutDateChange(updated, oldScheduledAt, newScheduledAt).catch((err) => {
      console.error('Erro ao enviar email de alteração de data:', err);
    });
  }

  res.json(updated);
});

router.delete('/:id', protect, async (req, res) => {
  const isAdmin = req.user.isAdmin === true;
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
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

    sendEmailSafe({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: request.owner.email,
      subject: 'Pedido eliminado - HomeFix',
      text,
      html,
    }).catch((err) => {
      console.error('Erro ao enviar email de eliminação de pedido:', err.message);
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

    sendEmailSafe({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: request.technician.email,
      subject: 'Pedido eliminado - HomeFix',
      text,
      html,
    }).catch((err) => {
      console.error('Erro ao enviar email de eliminação de pedido ao técnico:', err.message);
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
      owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
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
      owner: { select: { id: true, firstName: true, lastName: true, email: true, nif: true, avatarUrl: true } },
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
      owner: { select: { id: true, firstName: true, lastName: true, email: true, nif: true, avatarUrl: true } },
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
  
  notifyClientAboutRequestCompleted(updated, invoiceBase64, fileName).catch((err) => {
    console.error('Erro ao enviar email de conclusão ao cliente:', err);
  });
});

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
        owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        technician: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar preço:', error);
    res.status(500).json({ message: 'Erro ao atualizar preço' });
  }
});

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

    await sendEmailSafe({
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

    await sendEmailSafe({
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
        const result = await sendEmailSafe({
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

async function notifyClientAboutDateChange(request, oldDate, newDate) {
  try {
    if (!request.owner || !request.owner.email) {
      console.log('Cliente sem email, não é possível enviar notificação de alteração de data');
      return;
    }

    const ownerName = [request.owner.firstName, request.owner.lastName].filter(Boolean).join(' ').trim() || 'Cliente';
    const technicianName = request.technician
      ? [request.technician.firstName, request.technician.lastName].filter(Boolean).join(' ').trim() || request.technician.email
      : 'Técnico';

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const chatLink = `${appUrl}/chat?requestId=${request.id}`;
    const dashboardLink = `${appUrl}/dashboard`;

    const oldDateStr = oldDate ? new Date(oldDate).toLocaleString('pt-PT') : 'Não definida';
    const newDateStr = newDate ? new Date(newDate).toLocaleString('pt-PT') : 'Não definida';

    const text = [
      `Olá ${ownerName},`,
      '',
      `O técnico ${technicianName} alterou a data do seu pedido "${request.title}".`,
      '',
      `Data anterior: ${oldDateStr}`,
      `Nova data: ${newDateStr}`,
      '',
      'Se tiver alguma questão sobre esta alteração, pode contactar o técnico através do chat na aplicação.',
      '',
      `Link para chat: ${chatLink}`,
      `Link para dashboard: ${dashboardLink}`,
      '',
      'Atenciosamente,',
      'Equipa HomeFix'
    ].join('\n');

    const template = getBaseEmailTemplate('#ff7a00');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${template.styles}</style>
      </head>
      <body>
        <div class="container">
          ${template.header('HomeFix - Data Alterada')}
          <div class="content">
            <p>Olá <strong>${ownerName}</strong>,</p>
            
            <div class="info-box" style="background-color: #fff7ed; border-left: 4px solid #ff7a00; padding: 16px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0; font-size: 18px; color: #ff7a00;"><strong>📅 Data do pedido alterada</strong></p>
              <p style="margin: 8px 0 0 0; color: #374151;">O técnico <strong>${technicianName}</strong> alterou a data do seu pedido.</p>
            </div>
            
            <div class="details" style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #ff7a00; margin-top: 0;">${request.title}</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin-bottom: 12px; padding-left: 24px; position: relative;">
                  <span style="position: absolute; left: 0; color: #ff7a00;">▸</span>
                  <strong>Categoria:</strong> ${request.category}
                </li>
                <li style="margin-bottom: 12px; padding-left: 24px; position: relative;">
                  <span style="position: absolute; left: 0; color: #ff7a00;">▸</span>
                  <strong>Técnico:</strong> ${technicianName}
                </li>
                <li style="margin-bottom: 12px; padding-left: 24px; position: relative;">
                  <span style="position: absolute; left: 0; color: #ff7a00;">▸</span>
                  <strong>Data anterior:</strong> <span style="color: #6b7280;">${oldDateStr}</span>
                </li>
                <li style="margin-bottom: 12px; padding-left: 24px; position: relative;">
                  <span style="position: absolute; left: 0; color: #ff7a00;">▸</span>
                  <strong>Nova data:</strong> <strong style="color: #ff7a00; font-size: 16px;">${newDateStr}</strong>
                </li>
              </ul>
            </div>
            
            <p style="color: #374151; line-height: 1.6;">Se tiver alguma questão sobre esta alteração, pode contactar o técnico através do chat na aplicação.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${chatLink}" class="button" style="display: inline-block; padding: 14px 28px; background-color: #ff7a00; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 0 10px;">💬 Abrir Chat com Técnico</a>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${dashboardLink}" style="color: #ff7a00; text-decoration: none; font-weight: 600;">📋 Ver Meus Pedidos</a>
            </div>
            
            ${template.footer()}
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmailSafe({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: request.owner.email,
      subject: `📅 Data alterada: ${request.title} - HomeFix`,
      text,
      html,
    });

    console.log(`✅ Email de alteração de data enviado para ${request.owner.email}`);
  } catch (error) {
    console.error('Erro ao enviar email de alteração de data:', error);
  }
}

async function notifyAcceptance(request) {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const chatLink = `${appUrl}/chat?requestId=${request.id}`;
    const dashboardLink = `${appUrl}/dashboard`;
    const template = getBaseEmailTemplate('#28a745');

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

      await sendEmailSafe({
        from: '"HomeFix" <no-reply@homefix.com>',
        to: request.technician.email,
        subject: `Pedido aceite: ${request.title} - HomeFix`,
        text: textTech,
        html: htmlTech,
      });
    }

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

      await sendEmailSafe({
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

