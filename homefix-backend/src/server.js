// Wrapper para capturar erros de inicialização
try {
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const errorHandler = require('./middlewares/errorHandler');
const path = require('path');
const { getBaseEmailTemplate } = require('./utils/emailTemplates');

dotenv.config();

let prisma;
let protect;
try {
  prisma = require('./prismaClient');
  protect = require('./middlewares/authMiddleware').protect;
  console.log('✅ Prisma Client carregado com sucesso');
} catch (error) {
  console.error('❌ Erro ao carregar Prisma Client:', error);
  console.error('Stack:', error.stack);
  console.error('Por favor, execute: cd homefix-backend && npx prisma generate');
  
  // Criar objeto Prisma mock para evitar crashes
  prisma = {
    user: { 
      findUnique: () => Promise.reject(new Error('Prisma não inicializado')),
      findMany: () => Promise.reject(new Error('Prisma não inicializado')),
      update: () => Promise.reject(new Error('Prisma não inicializado')),
      delete: () => Promise.reject(new Error('Prisma não inicializado')),
    },
    maintenanceRequest: { 
      findMany: () => Promise.reject(new Error('Prisma não inicializado')),
      findUnique: () => Promise.reject(new Error('Prisma não inicializado')),
    },
    $disconnect: () => Promise.resolve(),
  };
  protect = (req, res, next) => res.status(503).json({ message: 'Serviço temporariamente indisponível - Prisma não inicializado' });
}

const app = express();

// Rota de diagnóstico simples (antes de qualquer middleware)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Configuração CORS - funciona localmente e no Vercel
app.use(cors({
  origin: true, // Permite qualquer origem (funciona localmente e no Vercel)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use(express.json());

app.use((req, res, next) => {
  if (req.path.startsWith('/api/public')) {
    console.log(`[DEBUG] Request to: ${req.method} ${req.path}`);
    console.log(`[DEBUG] Query:`, req.query);
  }
  next();
});

const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const emailRoutes = require('./routes/emailRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const publicRoutes = require('./routes/publicRoutes');
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

app.get('/api/profile', protect, (req, res) => {
  res.json(req.user);
});
app.patch('/api/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, nif, avatarUrl, birthDate, technicianCategory } = req.body || {};
    const data = {};
    if (typeof firstName === 'string' && firstName.trim()) data.firstName = firstName.trim();
    if (typeof lastName === 'string' && lastName.trim()) data.lastName = lastName.trim();
    
    if (nif !== undefined) {
      if (nif === '' || nif === null) {
        data.nif = null;
      } else if (typeof nif === 'string' && nif.trim()) {
        if (!/^\d{9}$/.test(nif.trim())) {
          return res.status(400).json({ message: 'NIF deve ter 9 dígitos' });
        }
        data.nif = nif.trim();
      }
    }
    
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
        email: true,
        nif: true,
        avatarUrl: true,
        technicianCategory: true,
      },
    });

    const mailer = require('./config/email');
    const userName = `${updated.firstName || ''} ${updated.lastName || ''}`.trim() || 'Utilizador';
    
    const text = [
      `Olá ${userName},`,
      '',
      'Confirmamos que o seu perfil foi atualizado com sucesso na HomeFix.',
      '',
      'Se não foi você quem realizou esta alteração, por favor contacte-nos imediatamente.',
      '',
      'Atenciosamente,',
      'Equipa HomeFix'
    ].join('\n');

    const template = getBaseEmailTemplate('#007bff');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${template.styles}</style>
      </head>
      <body>
        <div class="container">
          ${template.header('Perfil Atualizado')}
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="success-box">
              <p style="margin: 0;"><strong>✅ Perfil atualizado com sucesso!</strong></p>
            </div>
            
            <p>Confirmamos que o seu perfil foi atualizado na HomeFix.</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>⚠️ Segurança:</strong></p>
              <p style="margin: 8px 0 0 0;">Se não foi você quem realizou esta alteração, por favor contacte-nos imediatamente através da aplicação.</p>
            </div>
            
            ${template.footer()}
          </div>
        </div>
      </body>
      </html>
    `;

    mailer.sendMail({
      from: '"HomeFix" <no-reply@homefix.com>',
      to: updated.email,
      subject: 'Perfil atualizado - HomeFix',
      text,
      html,
    }).catch((err) => {
      console.error('Erro ao enviar email de atualização de perfil:', err);
    });

    res.json(updated);
  } catch (e) {
    console.error('Erro ao atualizar perfil:', e);
    res.status(400).json({ message: 'Não foi possível atualizar o perfil' });
  }
});

app.delete('/api/profile', protect, async (req, res) => {
  const userId = req.user.id;

  try {
    if (!prisma || !prisma.user) {
      return res.status(503).json({ message: 'Serviço temporariamente indisponível' });
    }
    
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

      const template = getBaseEmailTemplate('#6c757d');
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>${template.styles}</style>
        </head>
        <body>
          <div class="container">
            ${template.header('HomeFix - Conta Eliminada')}
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
              
              ${template.footer()}
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
        console.log(`✅ Email de confirmação de eliminação enviado para ${user.email}`);
      } catch (emailError) {
        console.error('Erro ao enviar email de confirmação de eliminação:', emailError);
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao eliminar conta:', error);
    res.status(400).json({ message: 'Não foi possível eliminar a conta.' });
  }
});

// Servir arquivos estáticos do frontend (apenas em produção quando estiver no mesmo deploy)
const clientDist = path.resolve(__dirname, '../../homefix-frontend/dist');
if (clientDist && require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Handler para rotas API não encontradas
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'Rota API não encontrada' });
});

app.use(errorHandler);

// Handler para erros não capturados (evita crash do servidor)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
  });
}

module.exports = app;

} catch (initError) {
  // Se houver erro na inicialização, criar um servidor mínimo que retorna erro
  console.error('❌ ERRO CRÍTICO na inicialização do servidor:', initError);
  console.error('Stack:', initError.stack);
  
  const express = require('express');
  const errorApp = express();
  
  errorApp.use((req, res) => {
    res.status(500).json({
      error: 'Erro na inicialização do servidor',
      message: initError.message,
      stack: process.env.NODE_ENV === 'development' ? initError.stack : undefined
    });
  });
  
  module.exports = errorApp;
}