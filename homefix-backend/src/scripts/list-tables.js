const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTables() {
  try {
    // Listar todas as tabelas usando SQL direto
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log('\n📊 Tabelas no banco de dados Neon:\n');
    console.log('─'.repeat(50));
    
    if (tables.length === 0) {
      console.log('Nenhuma tabela encontrada.');
    } else {
      tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name}`);
      });
    }

    console.log('─'.repeat(50));
    console.log(`\nTotal: ${tables.length} tabela(s)\n`);

    // Para cada tabela, mostrar a estrutura
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\n📋 Estrutura da tabela: ${tableName}`);
      console.log('─'.repeat(50));
      
      const columns = await prisma.$queryRawUnsafe(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position;
      `, tableName);

      columns.forEach((col, index) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  ${index + 1}. ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
      });
    }

    // Contar registros em cada tabela
    console.log('\n\n📈 Contagem de registros por tabela:');
    console.log('─'.repeat(50));
    
    for (const table of tables) {
      const tableName = table.table_name;
      try {
        const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}";`);
        console.log(`  ${tableName.padEnd(30)} ${count[0].count} registro(s)`);
      } catch (error) {
        console.log(`  ${tableName.padEnd(30)} Erro ao contar`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao listar tabelas:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listTables();

