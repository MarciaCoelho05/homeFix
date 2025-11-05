const prisma = require('../prismaClient');

async function getAllUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      isTechnician: true,
      technicianCategory: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
}

async function updateUserRole(req, res) {
  const { id } = req.params;
  const { isAdmin, isTechnician } = req.body || {};

  if (typeof isAdmin !== 'boolean' && typeof isTechnician !== 'boolean') {
    return res.status(400).json({ message: 'Indique pelo menos um papel para atualizar.' });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(typeof isAdmin === 'boolean' ? { isAdmin } : {}),
      ...(typeof isTechnician === 'boolean' ? { isTechnician } : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      isTechnician: true,
      technicianCategory: true,
    },
  });

  res.json(updated);
}

async function deleteUser(req, res) {
  const { id } = req.params;

  try {
    // Buscar dados do usuário antes de eliminar para enviar email de confirmação
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true, firstName: true, lastName: true },
    });

    await prisma.$transaction(async (tx) => {
      const ownedRequests = await tx.maintenanceRequest.findMany({
        where: { ownerId: id },
        select: { id: true },
      });
      const ownedRequestIds = ownedRequests.map((request) => request.id);

      if (ownedRequestIds.length) {
        await tx.message.deleteMany({ where: { requestId: { in: ownedRequestIds } } });
        await tx.feedback.deleteMany({ where: { requestId: { in: ownedRequestIds } } });
        await tx.maintenanceRequest.deleteMany({ where: { id: { in: ownedRequestIds } } });
      }

      await tx.feedback.deleteMany({ where: { userId: id } });
      await tx.message.deleteMany({ where: { senderId: id } });
      await tx.maintenanceRequest.updateMany({
        where: { technicianId: id },
        data: { technicianId: null, status: 'pendente' },
      });

      await tx.user.delete({ where: { id } });
    });

    // Enviar email de confirmação de eliminação
    if (user && user.email) {
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilizador';
      const mailer = require('../config/email');
      const { validateEmail } = require('../config/email');
      
      const text = [
        `Olá ${userName},`,
        '',
        'Informamos que a sua conta na HomeFix foi eliminada por um administrador.',
        '',
        'Todos os seus dados pessoais, pedidos e informações associadas foram permanentemente removidos do nosso sistema.',
        '',
        'Se tiver questões sobre esta ação, por favor contacte o suporte.',
        '',
        'Atenciosamente,',
        'Equipa HomeFix'
      ].join('\n');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 16px; margin: 16px 0; border-radius: 4px; }
            .footer { margin-top: 24px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">HomeFix - Conta Eliminada</h2>
            </div>
            <div class="content">
              <p>Olá <strong>${userName}</strong>,</p>
              
              <p>Informamos que a sua conta na HomeFix foi eliminada por um administrador.</p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>O que foi removido:</strong></p>
                <ul style="margin: 8px 0;">
                  <li>Dados pessoais e perfil</li>
                  <li>Pedidos de serviço</li>
                  <li>Mensagens e histórico de conversas</li>
                  <li>Feedback e avaliações</li>
                </ul>
                <p style="margin: 8px 0 0 0;">Todos os dados foram permanentemente removidos do nosso sistema.</p>
              </div>
              
              <p>Se tiver questões sobre esta ação, por favor contacte o suporte através do nosso site.</p>
              
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
        const validation = validateEmail(user.email);
        if (!validation.valid) {
          console.warn(`[DELETE-USER-ADMIN] ⚠️ Email bloqueado: ${user.email} - Razão: ${validation.reason}`);
        } else {
          await mailer.sendMail({
            from: '"HomeFix" <no-reply@homefix.com>',
            to: user.email,
            subject: 'Conta eliminada - HomeFix',
            text,
            html,
          });
          console.log(`✅ Email de confirmação de eliminação (admin) enviado para ${user.email}`);
        }
      } catch (emailError) {
        console.error('Erro ao enviar email de confirmação de eliminação:', emailError);
        // Não falhar a eliminação se o email falhar
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao eliminar utilizador:', error);
    res.status(400).json({ message: 'Não foi possível eliminar o utilizador.' });
  }
}

async function getAllRequests(req, res) {
  const requests = await prisma.maintenanceRequest.findMany({
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      technician: { select: { id: true, firstName: true, lastName: true, email: true } },
      feedback: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
}

async function deleteRequest(req, res) {
  const { id } = req.params;

  try {
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { requestId: id } }),
      prisma.feedback.deleteMany({ where: { requestId: id } }),
      prisma.maintenanceRequest.delete({ where: { id } }),
    ]);

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao eliminar pedido:', error);
    res.status(400).json({ message: 'Não foi possível eliminar o pedido.' });
  }
}

async function getAllFeedbacks(req, res) {
  const feedbacks = await prisma.feedback.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      request: { select: { id: true, title: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(feedbacks);
}

async function deleteFeedback(req, res) {
  const { id } = req.params;
  await prisma.feedback.delete({ where: { id } });
  res.status(204).send();
}

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllRequests,
  deleteRequest,
  getAllFeedbacks,
  deleteFeedback,
};
