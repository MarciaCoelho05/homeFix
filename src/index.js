import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API HomeFix funcionando!' });
});

app.get('/test-db', async (req, res) => {
  try {
    await prisma.$connect();
    res.json({ db: 'Conectado!' });
  } catch (err) {
    res.status(500).json({ db: 'Erro ao conectar', error: err.message });
  } finally {
    await prisma.$disconnect();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
