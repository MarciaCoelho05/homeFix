const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
const smtpPort = Number(process.env.SMTP_PORT || 2525);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!smtpHost || !smtpUser || !smtpPass) {
  console.error('[EMAIL] ⚠️  Configuração SMTP incompleta!');
  console.error('[EMAIL] Variáveis necessárias: SMTP_HOST, SMTP_USER, SMTP_PASS');
  console.error('[EMAIL] SMTP_HOST:', smtpHost ? '✅ definido' : '❌ não definido');
  console.error('[EMAIL] SMTP_USER:', smtpUser ? '✅ definido' : '❌ não definido');
  console.error('[EMAIL] SMTP_PASS:', smtpPass ? '✅ definido' : '❌ não definido');
  console.error('[EMAIL] SMTP_PORT:', smtpPort);
} else {
  console.log('[EMAIL] Configuração SMTP:');
  console.log('[EMAIL]   Host:', smtpHost);
  console.log('[EMAIL]   Port:', smtpPort);
  console.log('[EMAIL]   User:', smtpUser ? '✅ definido' : '❌ não definido');
  console.log('[EMAIL]   Pass:', smtpPass ? '✅ definido' : '❌ não definido');
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development'
});

transporter.verify(function (error, success) {
  if (error) {
    console.error('[EMAIL] ❌ Erro na verificação do servidor SMTP:', error);
    console.error('[EMAIL] Detalhes:', error.message);
  } else {
    console.log('[EMAIL] ✅ Servidor SMTP configurado e pronto');
  }
});

module.exports = transporter;
