const { PrismaClient } = require('@prisma/client');

// Singleton pattern para evitar múltiplas instâncias no serverless (Vercel)
const globalForPrisma = globalThis;

const prismaClient = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}

// Cleanup on process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prismaClient.$disconnect();
  });
}

module.exports = prismaClient;


