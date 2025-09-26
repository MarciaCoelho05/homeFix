import cron from "node-cron";
import nodemailer from "nodemailer";
import { prisma } from "../prisma.js";

// Configura o transport (Gmail, SMTP ou serviço externo como Resend)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

cron.schedule("* * * * *", async () => {
  const now = new Date();
  const emails = await prisma.scheduledEmail.findMany({
    where: { sendAt: { lte: now }, sentAt: null },
    include: { maintenance: true },
  });

  for (const e of emails) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: e.toEmail,
        subject: e.subject,
        text: e.body,
      });

      await prisma.scheduledEmail.update({
        where: { id: e.id },
        data: { sentAt: new Date() },
      });

      console.log(`Email enviado para ${e.toEmail}`);
    } catch (err) {
      console.error("Erro ao enviar email", err);
    }
  }
});
