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
    await tranporter.sendMail({
      to: email.toEmail,
      subject: email.subject,
      text: email.body
  });

  await prisma.scheduleEmail.update({
    where: { id: email.id},
    data: { sendAt: new Date() }
  })
  }

  console.log("✅${pendingEmails.length} e-mails enviados")
   
}

setInterval(processEmails, 60000); //corre a cada 60 segundos

