const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const errorHandler = require('./middlewares/errorHandler');
const path = require('path');
const prisma = require('./prismaClient');
const { protect } = require('./middlewares/authMiddleware');

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});
app.use(express.json());

// Debug middleware for Vercel (placed before routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/public')) {
    console.log(`[DEBUG] Request to: ${req.method} ${req.path}`);
    console.log(`[DEBUG] Query:`, req.query);
  }
  next();
});

// importar rotas existentes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const emailRoutes = require('./routes/emailRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const publicRoutes = require('./routes/publicRoutes');

// registar rotas
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/requests', maintenanceRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/public', publicRoutes);

console.log('Public routes registered at /api/public');

// profile routes
app.get('/api/profile', protect, (req, res) => {
  res.json(req.user);
});
app.patch('/api/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, avatarUrl, birthDate, technicianCategory } = req.body || {};
    const data = {};
    if (typeof firstName === 'string' && firstName.trim()) data.firstName = firstName.trim();
    if (typeof lastName === 'string' && lastName.trim()) data.lastName = lastName.trim();
    if (typeof avatarUrl === 'string' && avatarUrl.trim()) data.avatarUrl = avatarUrl.trim();
    if (birthDate) data.birthDate = new Date(birthDate);
    if (req.user.isTechnician === true && typeof technicianCategory === 'string') {
      data.technicianCategory = technicianCategory.trim();
    }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        technicianCategory: true,
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: 'Não foi possível atualizar o perfil' });
  }
});

app.delete('/api/profile', protect, async (req, res) => {
  const userId = req.user.id;

  try {
    // Buscar dados do usuário antes de eliminar para enviar email de confirmação
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    await prisma.$transaction(async (tx) => {
      const ownedRequests = await tx.maintenanceRequest.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      const ownedRequestIds = ownedRequests.map((req) => req.id);

      if (ownedRequestIds.length) {
        await tx.message.deleteMany({ where: { requestId: { in: ownedRequestIds } } });
        await tx.feedback.deleteMany({ where: { requestId: { in: ownedRequestIds } } });
        await tx.maintenanceRequest.deleteMany({ where: { id: { in: ownedRequestIds } } });
      }

      await tx.feedback.deleteMany({ where: { userId } });
      await tx.message.deleteMany({ where: { senderId: userId } });
      await tx.maintenanceRequest.updateMany({
        where: { technicianId: userId },
        data: { technicianId: null, status: 'pendente' },
      });

      await tx.user.delete({ where: { id: userId } });
    });

    // Enviar email de confirmação de eliminação
    if (user && user.email) {
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilizador';
      const mailer = require('./config/email');
      
      const text = [
        `Olá ${userName},`,
        '',
        'Confirmamos que a sua conta na HomeFix foi eliminada com sucesso.',
        '',
        'Todos os seus dados pessoais, pedidos e informações associadas foram permanentemente removidos do nosso sistema.',
        '',
        'Se foi um erro e deseja criar uma nova conta, pode registar-se novamente a qualquer momento.',
        '',
        'Obrigado por ter usado os nossos serviços.',
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
            .header { background-color: #6c757d; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 16px; margin: 16px 0; border-radius: 4px; }
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
              
              <p>Confirmamos que a sua conta na HomeFix foi eliminada com sucesso.</p>
              
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
              
              <p>Se foi um erro e deseja criar uma nova conta, pode registar-se novamente a qualquer momento através do nosso site.</p>
              
              <p>Obrigado por ter usado os nossos serviços. Esperamos vê-lo novamente no futuro!</p>
              
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
        await mailer.sendMail({
          from: '"HomeFix" <no-reply@homefix.com>',
          to: user.email,
          subject: 'Conta eliminada - HomeFix',
          text,
          html,
        });
        console.log(`Email de confirmação de eliminação enviado para ${user.email}`);
      } catch (emailError) {
        console.error('Erro ao enviar email de confirmação de eliminação:', emailError);
        // Não falhar a eliminação se o email falhar
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao eliminar conta:', error);
    res.status(400).json({ message: 'Não foi possível eliminar a conta.' });
  }
});

// serve frontend build
const clientDist = path.resolve(__dirname, '../../homefix-frontend/dist');
app.use(express.static(clientDist));

// Catch-all route for frontend (must be last, after all API routes)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use(errorHandler);

// iniciar o servidor

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
  });
}
module.exports = app;