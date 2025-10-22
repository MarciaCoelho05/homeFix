const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Rotas importadas
const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const messageRoutes = require('./routes/messages');

// Rota base
app.get('/', (req, res) => {
  res.json({ message: 'API HomeFix operacional ✅' });
});

// Usar rotas
app.use('/auth', authRoutes);
app.use('/requests', requestRoutes);
app.use('/messages', messageRoutes);

module.exports = app;