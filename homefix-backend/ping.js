const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      take: 1
    });
    console.log('✅ Conexão bem-sucedida com o banco de dados!');
    console.log('Usuário(s) de teste:', users);
  } catch (error) {
    console.error('❌ Erro na conexão com o banco:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();