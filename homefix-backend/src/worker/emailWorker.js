const prisma = require("../prismaClient");
const tranporter = require("../config/email");


async function processEmails() {

  const now = new Date();
  const pendingEmails = await prisma.scheduleEmail.findMany({
    where: {
      sendAt: { lte: now },
      sentAt: null
    },
  });

  for (const email of pendingEmails){
    try {
      // Validar email antes de enviar
      const toEmail = String(email.toEmail || '').toLowerCase().trim();
      const domain = toEmail.split('@')[1];
      
      // Bloquear domínios fictícios
      const blockedDomains = ['homefix.com', 'homefix.pt', 'example.com', 'test.com', 'localhost', 'invalid.com'];
      if (blockedDomains.some(blocked => domain === blocked || domain?.endsWith('.' + blocked))) {
        console.warn(`[EMAIL-WORKER] ⚠️ Ignorando email para domínio bloqueado: ${email.toEmail}`);
        // Marcar como enviado para não tentar novamente
        await prisma.scheduleEmail.update({
          where: { id: email.id},
          data: { sentAt: new Date() }
        });
        continue;
      }
      
      await tranporter.sendMail({
        to: email.toEmail,
        subject: email.subject,
        text: email.body
      });

      await prisma.scheduleEmail.update({
        where: { id: email.id},
        data: { sentAt: new Date() }
      });
    } catch (err) {
      console.error(`[EMAIL-WORKER] Erro ao enviar email ${email.id}:`, err.message);
      // Não marcar como enviado se houver erro
    }
  }

  console.log("✅${pendingEmails.length} e-mails enviados")
   
}

setInterval(processEmails, 60000); //corre a cada 60 segundos

