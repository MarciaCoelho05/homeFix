const express = require('express');
const prisma = require('../prismaClient');
const { protect } = require('../middlewares/authMiddleware');
const mailer = require('../config/email');
const { generateInvoicePDF } = require('../utils/pdf');

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
    select: { ownerId: true },
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
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff7a00; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #ff7a00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
          .info-box { background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 16px; margin: 16px 0; border-radius: 4px; }
          .details { background-color: white; padding: 16px; border-radius: 6px; margin: 16px 0; }
          .footer { margin-top: 24px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">HomeFix - Pedido Confirmado</h2>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>✅ Pedido recebido com sucesso!</strong></p>
              <p style="margin: 8px 0 0 0;">Recebemos o seu pedido de serviço e está em análise.</p>
            </div>
            
            <div class="details">
              <h3 style="margin-top: 0; color: #ff7a00;">${request.title}</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Categoria:</strong> ${request.category}</li>
                ${request.scheduledAt ? `<li><strong>Data preferencial:</strong> ${new Date(request.scheduledAt).toLocaleString('pt-PT')}</li>` : ''}
                ${request.price != null ? `<li><strong>Preço indicado:</strong> EUR ${Number(request.price).toFixed(2)}</li>` : ''}
              </ul>
              
              <p><strong>Descrição:</strong></p>
              <p style="background-color: #f5f5f5; padding: 12px; border-radius: 4px;">${request.description || '-'}</p>
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
            
            <div class="footer">
              <p>Atenciosamente,<br>Equipa HomeFix</p>
              <p style="font-size: 11px; color: #999;">Este é um email automático. Por favor, não responda a este email.</p>
            </div>
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
    
    console.log(`Email de confirmação de pedido enviado para ${owner.email}`);
  } catch (error) {
    console.error('Erro ao enviar email de confirmação ao cliente:', error);
  }
}

async function notifyClientAboutRequestCompleted(request, invoiceBase64, fileName) {
  try {
    if (!request.owner || !request.owner.email) {
      console.log('Cliente sem email, não é possível enviar email de conclusão');
      return;
    }

    const userName = `${request.owner.firstName || ''} ${request.owner.lastName || ''}`.trim() || 'Cliente';
    const technicianName = request.technician
      ? `${request.technician.firstName || ''} ${request.technician.lastName || ''}`.trim() || request.technician.email
      : 'Técnico';
    
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
      request.price != null ? `Preço: EUR ${Number(request.price).toFixed(2)}` : '',
      request.completedAt ? `Concluído em: ${new Date(request.completedAt).toLocaleString('pt-PT')}` : '',
      '',
      'A fatura/recibo está anexada a este email.',
      '',
      'Agradecemos a sua confiança na HomeFix!',
      '',
      'Se tiver alguma questão ou desejar deixar feedback, pode fazê-lo através da aplicação.',
      '',
      'Atenciosamente,',
      'Equipa HomeFix'
    ].filter(Boolean).join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 16px; margin: 16px 0; border-radius: 4px; }
          .details { background-color: white; padding: 16px; border-radius: 6px; margin: 16px 0; }
          .button { display: inline-block; background-color: #ff7a00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
          .footer { margin-top: 24px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">HomeFix - Serviço Concluído</h2>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="success-box">
              <p style="margin: 0;"><strong>✅ Serviço concluído com sucesso!</strong></p>
              <p style="margin: 8px 0 0 0;">O seu pedido foi concluído pelo técnico.</p>
            </div>
            
            <div class="details">
              <h3 style="margin-top: 0; color: #28a745;">${request.title}</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Categoria:</strong> ${request.category}</li>
                ${request.technician ? `<li><strong>Técnico:</strong> ${technicianName}</li>` : ''}
                ${request.price != null ? `<li><strong>Preço:</strong> EUR ${Number(request.price).toFixed(2)}</li>` : ''}
                ${request.completedAt ? `<li><strong>Concluído em:</strong> ${new Date(request.completedAt).toLocaleString('pt-PT')}</li>` : ''}
              </ul>
            </div>
            
            <p><strong>📄 Fatura/Recibo:</strong></p>
            <p>A fatura/recibo está anexada a este email em formato PDF.</p>
            
            <p>Agradecemos a sua confiança na HomeFix! Esperamos que tenha ficado satisfeito com o serviço prestado.</p>
            
            <p style="text-align: center;">
              <a href="${feedbackLink}" class="button">Deixar Feedback</a>
            </p>
            
            <p>Se tiver alguma questão ou precisar de esclarecimentos, pode contactar-nos através da aplicação.</p>
            
            <div class="footer">
              <p>Atenciosamente,<br>Equipa HomeFix</p>
              <p style="font-size: 11px; color: #999;">Este é um email automático. Por favor, não responda a este email.</p>
            </div>
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
    }

    await mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: request.owner.email,
      subject: `Serviço concluído: ${request.title} - HomeFix`,
      text,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    
    console.log(`Email de conclusão com fatura enviado para ${request.owner.email}`);
  } catch (error) {
    console.error('Erro ao enviar email de conclusão ao cliente:', error);
  }
}

async function notifyTechniciansAboutRequest(request, ownerId) {
  try {
    console.log('Notificando técnicos sobre novo pedido:', request.id);
    
    const technicians = await prisma.user.findMany({
      where: { isTechnician: true, email: { not: null } },
      select: { email: true, firstName: true, lastName: true, technicianCategory: true },
    });
    
    console.log(`Encontrados ${technicians.length} técnicos para notificar`);
    
    if (technicians.length === 0) {
      console.log('Nenhum técnico com email encontrado');
      return;
    }

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { firstName: true, lastName: true, email: true },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const requestLink = `${appUrl}/dashboard`;
    const mediaSection = request.mediaUrls && request.mediaUrls.length
      ? `<p><strong>Anexos:</strong></p><ul>${request.mediaUrls.map((url) => `<li><a href="${url}">${url}</a></li>`).join('')}</ul>`
      : '';

    const ownerName = owner 
      ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email || 'Cliente'
      : 'Cliente';

    // Enviar email personalizado para cada técnico
    const emailPromises = technicians.map(async (technician) => {
      const technicianName = `${technician.firstName || ''} ${technician.lastName || ''}`.trim() || 'Técnico';
      
      // Verificar se a categoria do técnico corresponde ao pedido
      const isRelevantCategory = technician.technicianCategory && 
        technician.technicianCategory.toLowerCase() === request.category?.toLowerCase();
      
      const categoryMessage = isRelevantCategory
        ? `<p style="background-color: #e7f3ff; padding: 12px; border-radius: 6px; margin: 16px 0;">
             <strong>✨ Este pedido corresponde à sua especialização (${technician.technicianCategory})!</strong>
           </p>`
        : '';

      const text = [
        `Olá ${technicianName},`,
        '',
        'Existe um novo pedido de orçamento disponível no HomeFix que pode ser do seu interesse.',
        '',
        `Título: ${request.title}`,
        `Categoria: ${request.category}`,
        isRelevantCategory ? `(Corresponde à sua especialização: ${technician.technicianCategory})` : '',
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
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff7a00; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #ff7a00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
            .details { background-color: white; padding: 16px; border-radius: 6px; margin: 16px 0; }
            .footer { margin-top: 24px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">HomeFix - Novo Pedido Disponível</h2>
            </div>
            <div class="content">
              <p>Olá <strong>${technicianName}</strong>,</p>
              
              <p>Existe um novo pedido de orçamento disponível no HomeFix que pode ser do seu interesse.</p>
              
              ${categoryMessage}
              
              <div class="details">
                <h3 style="margin-top: 0; color: #ff7a00;">${request.title}</h3>
                <ul style="list-style: none; padding: 0;">
                  <li><strong>Categoria:</strong> ${request.category}</li>
                  ${owner ? `<li><strong>Cliente:</strong> ${ownerName}${owner.email ? ` (${owner.email})` : ''}</li>` : ''}
                  ${request.scheduledAt ? `<li><strong>Data preferencial:</strong> ${new Date(request.scheduledAt).toLocaleString('pt-PT')}</li>` : ''}
                  ${request.price != null ? `<li><strong>Preço indicado:</strong> EUR ${Number(request.price).toFixed(2)}</li>` : ''}
                </ul>
                
                <p><strong>Descrição:</strong></p>
                <p style="background-color: #f5f5f5; padding: 12px; border-radius: 4px;">${request.description || '-'}</p>
                
                ${mediaSection}
              </div>
              
              <p style="text-align: center;">
                <a href="${requestLink}" class="button">Ver Pedido no Dashboard</a>
              </p>
              
              <div class="footer">
                <p>Atenciosamente,<br>Equipa HomeFix</p>
                <p style="font-size: 11px; color: #999;">Este é um email automático. Por favor, não responda a este email.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const result = await mailer.sendMail({
          from: '"HomeFix" <no-reply@homefix.com>',
          to: technician.email,
          subject: `Novo pedido de orçamento: ${request.title}${isRelevantCategory ? ' (Relevante para si)' : ''}`,
          text,
          html,
        });
        
        console.log(`Email personalizado enviado para ${technician.email}`, result.messageId);
        return { success: true, email: technician.email };
      } catch (emailError) {
        console.error(`Erro ao enviar email para ${technician.email}:`, emailError);
        return { success: false, email: technician.email, error: emailError.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Resumo: ${successful} emails enviados com sucesso, ${failed} falharam`);
    
    if (failed > 0) {
      console.error('Emails que falharam:', results.filter(r => !r.success));
    }
  } catch (error) {
    console.error('Erro ao enviar email de pedido:', error);
    console.error('Detalhes do erro:', error.message);
    console.error('Stack:', error.stack);
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
          <p>Olá ${technicianName || 'técnico'},</p>
          <p>Confirmamos que aceitaste o pedido <strong>${request.title}</strong> (${request.category}).</p>
          <p>Podes falar com o cliente e acompanhar o trabalho através do painel.</p>
          <p><a href="${chatLink}">Abrir chat com o cliente</a></p>
          <p><a href="${dashboardLink}">Ver pedidos atribuídos</a></p>
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
          <p>Olá ${ownerName || 'cliente'},</p>
          <p>O técnico <strong>${technicianName || request.technician.email}</strong> aceitou o pedido <strong>${
            request.title
          }</strong>.</p>
          <p>Poderá acompanhar o estado do trabalho e conversar com o técnico através da plataforma.</p>
          <p><a href="${chatLink}">Abrir chat com o técnico</a></p>
          <p><a href="${dashboardLink}">Ver pedidos</a></p>
        `,
      });
    }
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
  }
}

