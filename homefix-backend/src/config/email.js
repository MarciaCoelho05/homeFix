const nodemailer = require('nodemailer')

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!smtpHost || !smtpUser || !smtpPass) {
  console.error('[EMAIL] ⚠️  Configuração SMTP incompleta!');
  console.error('[EMAIL] Variáveis necessárias: SMTP_HOST, SMTP_USER, SMTP_PASS');
  console.error('[EMAIL] SMTP_HOST:', smtpHost ? '✅ definido' : '❌ não definido');
  console.error('[EMAIL] SMTP_USER:', smtpUser ? '✅ definido' : '❌ não definido');
  console.error('[EMAIL] SMTP_PASS:', smtpPass ? '✅ definido' : '❌ não definido');
  console.error('[EMAIL] SMTP_PORT:', smtpPort);
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: smtpUser && smtpPass ? {
    user: smtpUser,
    pass: smtpPass,
  } : undefined,
  tls: {
    rejectUnauthorized: false
  }
})

transporter.verify(function (error, success) {
  if (error) {
    console.error('[EMAIL] ❌ Erro na verificação do servidor SMTP:', error);
  } else {
    console.log('[EMAIL] ✅ Servidor SMTP configurado e pronto');
  }
});

module.exports = transporter
