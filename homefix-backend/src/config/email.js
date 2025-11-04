const https = require('https');

const mailtrapApiToken = process.env.MAILTRAP_API_TOKEN;
const mailtrapInboxId = process.env.MAILTRAP_INBOX_ID || '0';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (mailtrapApiToken) {
  console.log('[EMAIL] ✅ Usando Mailtrap API (recomendado para Railway)');
  console.log('[EMAIL]   API Token:', mailtrapApiToken ? '✅ definido' : '❌ não definido');
  console.log('[EMAIL]   Inbox ID:', mailtrapInboxId);
} else if (smtpUser && smtpPass) {
  console.log('[EMAIL] ⚠️  Usando SMTP (Railway pode bloquear conexões SMTP)');
  console.log('[EMAIL]   Se tiver problemas, configure MAILTRAP_API_TOKEN');
  console.log('[EMAIL]   SMTP Host:', process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io');
  console.log('[EMAIL]   SMTP Port:', process.env.SMTP_PORT || '2525');
} else {
  console.error('[EMAIL] ❌ Configuração incompleta!');
  console.error('[EMAIL] Configure MAILTRAP_API_TOKEN (recomendado) ou SMTP_USER/SMTP_PASS');
}

const sendMailViaMailtrapAPI = async (mailOptions) => {
  if (!mailtrapApiToken) {
    throw new Error('MAILTRAP_API_TOKEN não está configurado');
  }

  const token = String(mailtrapApiToken).trim();
  const inboxId = String(mailtrapInboxId).trim();

  if (!token || token.length < 10) {
    throw new Error('MAILTRAP_API_TOKEN inválido ou muito curto');
  }

  console.log(`[EMAIL] Enviando email via Mailtrap API`);
  console.log(`[EMAIL] Inbox ID: ${inboxId}`);
  console.log(`[EMAIL] Token length: ${token.length} caracteres`);

  let fromEmail = mailOptions.from || 'no-reply@homefix.com';
  if (typeof fromEmail === 'string' && fromEmail.includes('<')) {
    const match = fromEmail.match(/<(.+)>/);
    if (match) fromEmail = match[1];
  }

  const emailData = {
    from: {
      email: fromEmail,
      name: 'HomeFix'
    },
    to: Array.isArray(mailOptions.to) 
      ? mailOptions.to.map(email => typeof email === 'string' ? { email } : email)
      : [{ email: mailOptions.to }],
    subject: mailOptions.subject || 'Sem assunto',
    text: mailOptions.text || '',
    html: mailOptions.html || mailOptions.text || ''
  };

  if (mailOptions.attachments && Array.isArray(mailOptions.attachments)) {
    emailData.attachments = mailOptions.attachments.map(att => ({
      filename: att.filename || 'attachment',
      content: att.content || att.path,
      type: att.contentType || 'application/octet-stream',
      disposition: 'attachment'
    }));
  }

  const url = `https://sandbox.api.mailtrap.io/api/send/${inboxId}`;
  console.log(`[EMAIL] URL: ${url}`);

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(emailData);
    
    const urlObj = new URL(url);
    const authHeader = `Bearer ${token}`;
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000
    };

    console.log(`[EMAIL] Headers: Authorization=${authHeader.substring(0, 20)}... (${authHeader.length} chars)`);
    console.log(`[EMAIL] Payload preview:`, JSON.stringify(emailData).substring(0, 100) + '...');

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`[EMAIL] Resposta da API: Status ${res.statusCode}`);
        console.log(`[EMAIL] Resposta: ${responseData.substring(0, 200)}`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(responseData || '{}');
            console.log(`[EMAIL] ✅ Email enviado via Mailtrap API: ${result.message_ids?.[0] || 'N/A'}`);
            resolve({
              messageId: result.message_ids?.[0] || 'mailtrap-' + Date.now(),
              accepted: emailData.to.map(t => t.email),
              response: result
            });
          } catch (parseError) {
            console.log(`[EMAIL] ✅ Email enviado via Mailtrap API (resposta não-JSON)`);
            resolve({
              messageId: 'mailtrap-' + Date.now(),
              accepted: emailData.to.map(t => t.email)
            });
          }
        } else {
          const error = new Error(`Mailtrap API error: ${res.statusCode} - ${responseData}`);
          console.error('[EMAIL] ❌ Erro ao enviar email via Mailtrap API:', error.message);
          console.error('[EMAIL] ❌ Verifique se o token está correto e tem permissões para enviar emails');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('[EMAIL] ❌ Erro na requisição Mailtrap API:', error);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout ao enviar email via Mailtrap API'));
    });

    req.write(data);
    req.end();
  });
};

const sendMailViaSMTP = async (mailOptions) => {
  const nodemailer = require('nodemailer');
  const smtpHost = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
  const smtpPort = Number(process.env.SMTP_PORT || 2525);
  
  console.log(`[EMAIL] Tentando SMTP: ${smtpHost}:${smtpPort}`);
  
  const smtpTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587 || smtpPort === 2525,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
  
  return await smtpTransporter.sendMail(mailOptions);
};

const transporter = {
  sendMail: async (mailOptions) => {
    if (mailtrapApiToken) {
      try {
        return await sendMailViaMailtrapAPI(mailOptions);
      } catch (apiError) {
        console.error('[EMAIL] ❌ Erro ao enviar email via API:', apiError.message);
        
        if (smtpUser && smtpPass) {
          console.log('[EMAIL] 🔄 Tentando fallback para SMTP...');
          try {
            const result = await sendMailViaSMTP(mailOptions);
            console.log('[EMAIL] ✅ Email enviado via SMTP (fallback)');
            return result;
          } catch (smtpError) {
            console.error('[EMAIL] ❌ Erro SMTP (fallback):', smtpError.message);
            console.error('[EMAIL] ⚠️  Railway pode estar bloqueando conexões SMTP');
            throw new Error(`Falha na API (${apiError.message}) e no SMTP (${smtpError.message})`);
          }
        } else {
          console.error('[EMAIL] ❌ SMTP não configurado para fallback');
          throw apiError;
        }
      }
    } else if (smtpUser && smtpPass) {
      try {
        return await sendMailViaSMTP(mailOptions);
      } catch (smtpError) {
        console.error('[EMAIL] ❌ Erro SMTP:', smtpError.message);
        console.error('[EMAIL] ⚠️  Railway pode estar bloqueando conexões SMTP');
        console.error('[EMAIL] 💡 Recomendação: Use MAILTRAP_API_TOKEN em vez de SMTP');
        throw smtpError;
      }
    } else {
      throw new Error('Nenhuma configuração de email disponível (API ou SMTP)');
    }
  },
  verify: (callback) => {
    if (mailtrapApiToken) {
      console.log('[EMAIL] ✅ Mailtrap API configurado e pronto');
      callback(null, true);
    } else if (smtpUser && smtpPass) {
      console.log('[EMAIL] ⚠️  SMTP configurado (pode ter problemas de timeout)');
      callback(null, true);
    } else {
      callback(new Error('Nenhuma configuração de email encontrada'));
    }
  }
};

console.log('[EMAIL] ✅ Transporter criado');

module.exports = transporter;
