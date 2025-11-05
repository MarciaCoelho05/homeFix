const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const smtpHost = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 2525;
const smtpUser = process.env.SMTP_USER || 'bb1d8a3acdfc8e';
const smtpPass = process.env.SMTP_PASS;

if (!smtpPass) {
  console.error('[EMAIL] ⚠️  SMTP_PASS não está configurado');
  console.error('[EMAIL] Configure SMTP_PASS no Railway como variável de ambiente');
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass
  },
  tls: {
    rejectUnauthorized: false
  }
});

const emailTransporter = {
  sendMail: async (mailOptions) => {
    if (!smtpPass) {
      throw new Error('SMTP_PASS não está configurado. Configure no Railway como variável de ambiente.');
    }

    try {
      const result = await transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('[EMAIL] Erro ao enviar email:', error.message);
      throw error;
    }
  },
  verify: (callback) => {
    transporter.verify((error, success) => {
      if (error) {
        console.error('[EMAIL] Erro na verificação SMTP:', error.message);
        callback(error);
      } else {
        console.log('[EMAIL] ✅ SMTP configurado e pronto');
        callback(null, true);
      }
    });
  }
};

module.exports = emailTransporter;
