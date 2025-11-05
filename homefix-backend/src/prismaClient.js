const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

let prismaClient;

try {
  prismaClient = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaClient;
  }
} catch (error) {
  console.error('Erro ao inicializar Prisma Client:', error);
  console.error('Verifique se o Prisma Client foi gerado corretamente com: npx prisma generate');
  throw error;
}

if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    try {
      await prismaClient.$disconnect();
    } catch (error) {
      console.error('Erro ao desconectar Prisma:', error);
    }
  });
}

module.exports = prismaClient;


