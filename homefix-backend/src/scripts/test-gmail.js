const mailer = require('../config/email');

async function testGmail() {
  console.log('\n🧪 Testando Gmail API...\n');

  try {
    console.log('1️⃣ Verificando conexão com Gmail API...');
    await new Promise((resolve, reject) => {
      mailer.verify((error, success) => {
        if (error) {
          console.error('❌ Erro na verificação:', error.message);
          reject(error);
        } else {
          console.log('✅ Verificação bem-sucedida!\n');
          resolve(success);
        }
      });
    });

    console.log('2️⃣ Testando envio de email...');
    const testEmail = process.env.TEST_EMAIL || 'teste@example.com';
    
    const result = await mailer.sendMail({
      to: testEmail,
      subject: 'Teste Gmail API - HomeFix',
      text: 'Este é um email de teste da Gmail API.',
      html: '<p>Este é um <strong>email de teste</strong> da Gmail API.</p>'
    });

    console.log('\n✅ Email enviado com sucesso!');
    console.log('Message ID:', result.messageId);
    console.log('Accepted:', result.accepted);
    
  } catch (error) {
    console.error('\n❌ Erro no teste:');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testGmail();

