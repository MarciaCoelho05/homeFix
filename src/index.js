import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log('✅ Conexão com o banco OK!');
  } catch (err) {
    console.error('❌ Erro de conexão:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();