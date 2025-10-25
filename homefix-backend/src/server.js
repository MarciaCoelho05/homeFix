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

// profile
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

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao eliminar conta:', error);
    res.status(400).json({ message: 'Não foi possível eliminar a conta.' });
  }
});

// serve frontend build
const clientDist = path.resolve(__dirname, '../../homefix-frontend/dist');
app.use(express.static(clientDist));
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












