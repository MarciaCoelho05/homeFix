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
  console.log('Prisma Client carregado com sucesso');
} catch (error) {
  console.error('Erro ao carregar Prisma Client:', error);
  console.error('Stack:', error.stack);
  console.error('Por favor, execute: cd homefix-backend && npx prisma generate');
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

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const method = req.method;
  const path = req.path;
  
  console.log(`[CORS] ${method} ${path} - Origin: ${origin || 'none'} - Host: ${req.headers.host || 'none'}`);
  
  const allowedOrigins = [
    'https://homefix-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (method === 'OPTIONS') {
    console.log(`[CORS] OPTIONS preflight - returning 204 for ${path}`);
    return res.status(204).end();
  }
  
  next();
});

app.get('/', (req, res) => {
  const origin = req.headers.origin;
  console.log('[ROOT] Root path requested');
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.json({ 
    status: 'ok', 
    message: 'HomeFix API is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  const origin = req.headers.origin;
  console.log('[HEALTH] Health check requested');
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/cors-test', (req, res) => {
  const origin = req.headers.origin;
  console.log(`[CORS-TEST] GET /api/cors-test - Origin: ${origin || 'none'}`);
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.json({ 
    message: 'CORS test successful',
    origin: origin || 'none',
    timestamp: new Date().toISOString()
  });
});

app.use(express.json());

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const origin = req.headers.origin;
    if (origin && !this.headersSent) {
      this.setHeader('Access-Control-Allow-Origin', origin);
      this.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    return originalJson.call(this, data);
  };
  
  const originalEnd = res.end.bind(res);
  res.end = function(chunk, encoding) {
    const origin = req.headers.origin;
    if (origin && !this.headersSent) {
      this.setHeader('Access-Control-Allow-Origin', origin);
      this.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    return originalEnd.call(this, chunk, encoding);
  };
  
  if (req.path.startsWith('/api')) {
    console.log(`[SERVER] ${req.method} ${req.path} - Headers:`, {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'present' : 'missing',
      'origin': req.headers.origin || 'none'
    });
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


app.get('/api/profile', protect, (req, res) => {
  try {
    const user = { ...req.user };
    if (user.technicianCategory !== undefined && user.technicianCategory !== null) {
      if (Array.isArray(user.technicianCategory)) {
        user.technicianCategory = user.technicianCategory.filter(cat => cat != null && String(cat).trim());
      } else if (typeof user.technicianCategory === 'string') {
        user.technicianCategory = user.technicianCategory.trim() ? [user.technicianCategory.trim()] : [];
      } else {
        user.technicianCategory = [];
      }
    } else {
      user.technicianCategory = [];
    }
    res.json(user);
  } catch (err) {
    console.error('Erro ao obter perfil:', err);
    res.status(500).json({ message: 'Erro ao carregar perfil' });
  }
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
    if (req.user.isTechnician === true && technicianCategory !== undefined) {
      if (Array.isArray(technicianCategory)) {
        data.technicianCategory = technicianCategory.filter(cat => cat && cat.trim()).map(cat => cat.trim());
      } else if (technicianCategory === null || technicianCategory === '') {
        data.technicianCategory = [];
      } else if (typeof technicianCategory === 'string' && technicianCategory.trim()) {
        data.technicianCategory = [technicianCategory.trim()];
      }
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
        console.log(`Email de confirmacao de eliminacao enviado para ${user.email}`);
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

const clientDist = path.resolve(__dirname, '../../homefix-frontend/dist');
if (clientDist && require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.get('/robots.txt', (req, res) => {
  res.status(204).end();
});

app.use((req, res) => {
  const origin = req.headers.origin;
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    console.log(`[404-HANDLER] OPTIONS preflight - returning 204 for ${req.path}`);
    return res.status(204).end();
  }
  
  if (req.path.startsWith('/api')) {
    res.status(404).json({ message: 'Rota API não encontrada' });
  } else {
    const staticResources = ['/favicon.ico', '/robots.txt', '/sitemap.xml'];
    if (staticResources.includes(req.path)) {
      res.status(204).end();
    } else {
      res.status(404).json({ message: 'Rota não encontrada' });
    }
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled Rejection at:', promise);
  console.error('[ERROR] Reason:', reason);
  console.error('[ERROR] Stack:', reason?.stack);
});

process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught Exception:', error);
  console.error('[ERROR] Stack:', error.stack);
  process.exit(1);
});

const PORT = process.env.PORT || process.env.RAILWAY_PORT || 3000;

if (require.main === module) {
  console.log(`[SERVER] Environment PORT: ${process.env.PORT || 'not set'}`);
  console.log(`[SERVER] Railway PORT: ${process.env.RAILWAY_PORT || 'not set'}`);
  console.log(`[SERVER] Will listen on port: ${PORT}`);
  
  if (!process.env.PORT && !process.env.RAILWAY_PORT) {
    console.warn('[SERVER] WARNING: PORT environment variable is not set!');
    console.warn('[SERVER] Railway should set this automatically.');
    console.warn('[SERVER] If Railway shows "Port 8000", make sure PORT=8000 is set in Railway variables.');
  }
  
  try {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Servidor a correr na porta ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[SERVER] Listening on 0.0.0.0:${PORT}`);
      console.log(`[SERVER] CORS middleware installed - ready to accept requests`);
      console.log(`[SERVER] Health check: http://0.0.0.0:${PORT}/health`);
    });
    
    server.on('error', (err) => {
      console.error('[SERVER] Server error:', err);
      console.error('[SERVER] Error code:', err.code);
      console.error('[SERVER] Error message:', err.message);
      if (err.code === 'EADDRINUSE') {
        console.error(`[SERVER] Port ${PORT} is already in use`);
      }
    });
    
    server.on('request', (req, res) => {
      console.log(`[SERVER-REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    });
    
    server.on('connection', (socket) => {
      console.log(`[SERVER] New connection from ${socket.remoteAddress}`);
    });
    
    server.on('close', () => {
      console.log('[SERVER] Server closed');
    });
    
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (listenError) {
    console.error('Erro ao iniciar servidor:', listenError);
    console.error('Stack:', listenError.stack);
    process.exit(1);
  }
}

module.exports = app;

} catch (initError) {
  console.error('ERRO CRITICO na inicializacao do servidor:', initError);
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