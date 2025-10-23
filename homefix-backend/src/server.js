const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const errorHandler = require('./middlewares/errorHandler');
const path = require('path');
const prisma = require('./prismaClient');
const { protect } = require('./middlewares/authMiddleware');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// importar rotas existentes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const emailRoutes = require('./routes/emailRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// registar rotas
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/requests', maintenanceRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

// profile
app.get('/api/profile', protect, (req, res) => {
  res.json(req.user);
});
app.patch('/api/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, avatarUrl, birthDate } = req.body || {};
    const data = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (avatarUrl) data.avatarUrl = avatarUrl;
    if (birthDate) data.birthDate = new Date(birthDate);
    const updated = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ id: updated.id, firstName: updated.firstName, lastName: updated.lastName, avatarUrl: updated.avatarUrl });
  } catch (e) {
    res.status(400).json({ message: 'Não foi possível atualizar o perfil' });
  }
});

// serve frontend build
const clientDist = path.resolve(__dirname, '../../homefix-frontend/dist');
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});
//error
app.use(errorHandler);

// iniciar o servidor

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
  });
}
module.exports = app;











