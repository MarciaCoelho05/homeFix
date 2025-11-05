const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function restoreDatabase() {
  console.log('🔄 Iniciando restauração do banco de dados...\n');

  try {
    // 1. Gerar Prisma Client
    console.log('📦 1. Gerando Prisma Client...');
    execSync('npx prisma generate --schema=./prisma/schema.prisma', { stdio: 'inherit' });
    console.log('✅ Prisma Client gerado\n');

    // 2. Aplicar migrações (com retry em caso de timeout)
    console.log('📦 2. Aplicando migrações...');
    let migrationSuccess = false;
    let retries = 3;
    
    while (!migrationSuccess && retries > 0) {
      try {
        execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', { 
          stdio: 'inherit',
          timeout: 60000 // 60 segundos
        });
        migrationSuccess = true;
        console.log('✅ Migrações aplicadas\n');
      } catch (error) {
        retries--;
        if (retries > 0) {
          console.log(`⚠️  Erro ao aplicar migrações, tentando novamente... (${retries} tentativas restantes)`);
          console.log('⏳ Aguardando 5 segundos antes de tentar novamente...\n');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.error('❌ Falha ao aplicar migrações após múltiplas tentativas');
          throw error;
        }
      }
    }

    // 3. Executar seed
    console.log('🌱 3. Executando seed...');
    execSync('node prisma/seed.js', { stdio: 'inherit' });
    console.log('✅ Seed executado\n');

    // 4. Verificar tabelas
    console.log('🔍 4. Verificando tabelas...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log('✅ Tabelas encontradas:');
    tables.forEach((table) => {
      console.log(`   - ${table.table_name}`);
    });

    // 5. Verificar utilizadores
    console.log('\n👥 5. Verificando utilizadores...');
    const users = await prisma.user.findMany({
      select: {
        email: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        isTechnician: true,
      },
    });

    if (users.length > 0) {
      console.log(`✅ ${users.length} utilizador(es) encontrado(s):`);
      users.forEach((user) => {
        const role = user.isAdmin ? 'Admin' : user.isTechnician ? 'Técnico' : 'Cliente';
        console.log(`   - ${user.email} (${user.firstName} ${user.lastName}) - ${role}`);
      });
    } else {
      console.log('⚠️  Nenhum utilizador encontrado. Execute o seed novamente.');
    }

    console.log('\n✅ Restauração do banco de dados concluída com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro durante a restauração:', error.message);
    console.error('\n💡 Soluções:');
    console.error('   1. Verifique se DATABASE_URL está configurado corretamente');
    console.error('   2. Verifique se tem permissões no banco de dados Neon');
    console.error('   3. Tente executar manualmente:');
    console.error('      - npx prisma migrate deploy --schema=./prisma/schema.prisma');
    console.error('      - node prisma/seed.js');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

restoreDatabase();

