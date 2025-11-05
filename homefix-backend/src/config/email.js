const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mailtrapApiToken = process.env.MAILTRAP_API_TOKEN;
const mailtrapInboxId = process.env.MAILTRAP_INBOX_ID;
const mailtrapApiType = process.env.MAILTRAP_API_TYPE || 'sandbox';
const mailtrapDomain = process.env.MAILTRAP_DOMAIN;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME || false;

if (mailtrapApiToken && mailtrapApiToken.trim()) {
  console.log('[EMAIL] ✅ Usando Mailtrap API (recomendado para Railway)');
  console.log('[EMAIL]   API Token:', mailtrapApiToken ? '✅ definido' : '❌ não definido');
  console.log('[EMAIL]   API Type:', mailtrapApiType === 'sending' ? 'Sending API (envio real)' : 'Sandbox API (teste)');
  if (mailtrapApiType === 'sandbox') {
    console.log('[EMAIL]   Inbox ID:', mailtrapInboxId);
  }
} else if (smtpUser && smtpPass) {
  console.log('[EMAIL] ⚠️  Usando SMTP');
  const smtpHost = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
  const smtpPort = process.env.SMTP_PORT || (smtpHost.includes('gmail.com') ? '587' : '2525');
  console.log('[EMAIL]   SMTP Host:', smtpHost);
  console.log('[EMAIL]   SMTP Port:', smtpPort);
  console.log('[EMAIL]   SMTP User:', smtpUser ? '✅ definido' : '❌ não definido');
  console.log('[EMAIL]   SMTP Pass:', smtpPass ? '✅ definido' : '❌ não definido');
  
  
  if (smtpHost.includes('gmail.com')) {
    console.log('[EMAIL] ⚠️  Gmail detectado: Use App Password (não a senha normal)');
    console.log('[EMAIL] 💡 Como obter App Password:');
    console.log('[EMAIL]     1. Google Account → Segurança');
    console.log('[EMAIL]     2. Ative Verificação em 2 etapas');
    console.log('[EMAIL]     3. Senhas de app → Gere uma nova senha');
  }
  
  if (process.env.NODE_ENV === 'production' && !isRailway) {
    console.log('[EMAIL] ⚠️  Em produção, Railway pode bloquear conexões SMTP');
    console.log('[EMAIL]   Se tiver problemas, configure MAILTRAP_API_TOKEN');
  }
}

const sendMailViaMailtrapAPI = async (mailOptions) => {
  const token = String(mailtrapApiToken || '').trim();
  const inboxId = mailtrapInboxId ? String(mailtrapInboxId).trim() : null;

  if (!token || token.length < 10) {
    throw new Error('MAILTRAP_API_TOKEN não está configurado ou é inválido');
  }

  const apiType = mailtrapApiType || 'sandbox';
  
  if (apiType === 'sandbox' && !inboxId) {
    throw new Error('MAILTRAP_INBOX_ID é obrigatório para Sandbox API');
  }
  
  if (apiType === 'sending' && !mailtrapDomain) {
    throw new Error('MAILTRAP_DOMAIN é obrigatório para Sending API');
  }

  console.log(`[EMAIL] Enviando email via Mailtrap API (${apiType})`);
  console.log(`[EMAIL] Token (primeiros 10): ${token.substring(0, 10)}... (${token.length} chars)`);
  
  if (apiType === 'sandbox') {
    console.log(`[EMAIL] Inbox ID: ${inboxId}`);
  }

  let fromEmail = mailOptions.from;
  if (!fromEmail) {
    if (apiType === 'sending' && mailtrapDomain) {
      fromEmail = `no-reply@${mailtrapDomain}`;
    } else {
      fromEmail = 'no-reply@homefix.com';
    }
  }
  
  if (typeof fromEmail === 'string' && fromEmail.includes('<')) {
    const match = fromEmail.match(/<(.+)>/);
    if (match) fromEmail = match[1];
  }

  const toEmails = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];
  
  const emailData = {
    from: {
      email: fromEmail,
      name: 'HomeFix'
    },
    to: toEmails.map(email => ({ email: String(email) })),
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

  const url = apiType === 'sandbox'
    ? `https://sandbox.api.mailtrap.io/api/send/${inboxId}`
    : `https://send.api.mailtrap.io/api/send`;
  
  console.log(`[EMAIL] URL: ${url}`);
  console.log(`[EMAIL] Enviando para: ${toEmails.join(', ')}`);

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(emailData);
    const urlObj = new URL(url);
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Api-Token': token
    };
    
    console.log(`[EMAIL] Usando header Api-Token (${apiType === 'sandbox' ? 'Sandbox' : 'Sending'} API)`);
    console.log(`[EMAIL] Header Api-Token: ${token.substring(0, 10)}...${token.substring(token.length - 5)}`);
    console.log(`[EMAIL] Headers completos:`, JSON.stringify(Object.keys(headers)));
    console.log(`[EMAIL] Payload email:`, JSON.stringify({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      text_length: emailData.text?.length || 0,
      html_length: emailData.html?.length || 0
    }));
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: headers,
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`[EMAIL] Resposta da API: Status ${res.statusCode}`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(responseData || '{}');
            console.log(`[EMAIL] ✅ Email enviado via Mailtrap API`);
            console.log(`[EMAIL] Message ID: ${result.message_ids?.[0] || 'N/A'}`);
            resolve({
              messageId: result.message_ids?.[0] || 'mailtrap-' + Date.now(),
              accepted: toEmails,
              response: result
            });
          } catch (parseError) {
            console.log(`[EMAIL] ✅ Email enviado via Mailtrap API (resposta não-JSON)`);
            resolve({
              messageId: 'mailtrap-' + Date.now(),
              accepted: toEmails
            });
          }
        } else {
          const error = new Error(`Mailtrap API error: ${res.statusCode} - ${responseData}`);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
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
  const smtpHost = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
  
  console.log(`[EMAIL] Configurando SMTP: ${smtpHost}`);
  console.log(`[EMAIL] SMTP_USER: ${smtpUser ? '✅ definido' : '❌ não definido'}`);
  console.log(`[EMAIL] SMTP_PASS: ${smtpPass ? '✅ definido' : '❌ não definido'}`);
  
  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP_USER e SMTP_PASS são obrigatórios para envio via SMTP');
  }
  
  const isGmail = smtpHost.includes('gmail.com');
  const isMailtrap = smtpHost.includes('mailtrap.io');
  
  let finalPort = smtpPort;
  let isSecure = false;
  let useStartTLS = false;
  let tlsConfig = {};
  
  if (isGmail) {
    finalPort = smtpPort || 587;
    isSecure = finalPort === 465;
    useStartTLS = finalPort === 587;
    tlsConfig = {
      rejectUnauthorized: true,
    };
    console.log(`[EMAIL] 📧 Configuração Gmail detectada`);
    console.log(`[EMAIL] ⚠️  IMPORTANTE: Use App Password do Gmail, não a senha normal!`);
    console.log(`[EMAIL] 💡 Como obter: Google Account → Segurança → Verificação em 2 etapas → Senhas de app`);
  } else if (isMailtrap) {
    finalPort = smtpPort || 2525;
    isSecure = false;
    useStartTLS = true;
    tlsConfig = {
      rejectUnauthorized: false,
    };
    console.log(`[EMAIL] 📧 Configuração Mailtrap detectada`);
  } else {
    finalPort = smtpPort || 587;
    isSecure = finalPort === 465;
    useStartTLS = finalPort === 587 || finalPort === 25;
    tlsConfig = {
      rejectUnauthorized: false,
    };
    console.log(`[EMAIL] 📧 Configuração SMTP genérica`);
  }
  
  console.log(`[EMAIL] Porta: ${finalPort}, secure=${isSecure}, requireTLS=${useStartTLS}`);
  
  try {
    const smtpTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: finalPort,
      secure: isSecure,
      requireTLS: useStartTLS,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: tlsConfig,
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    });
    
    console.log(`[EMAIL] Verificando conexão SMTP...`);
    await smtpTransporter.verify();
    console.log(`[EMAIL] ✅ Conexão SMTP verificada com sucesso`);
    
    console.log(`[EMAIL] Enviando email para: ${mailOptions.to}`);
    const result = await smtpTransporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Email enviado via SMTP (porta ${finalPort})`);
    console.log(`[EMAIL] Message ID: ${result.messageId || 'N/A'}`);
    return result;
  } catch (error) {
    const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME || false;
    
    if (error.code === 'EAUTH') {
      if (isGmail) {
        throw new Error('Erro de autenticação Gmail. Verifique se está a usar App Password (não a senha normal). Para obter: Google Account → Segurança → Verificação em 2 etapas → Senhas de app');
      } else {
        throw new Error('Erro de autenticação SMTP. Verifique SMTP_USER e SMTP_PASS.');
      }
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      let errorMsg = `Não foi possível conectar ao servidor SMTP ${smtpHost}:${finalPort}. Verifique a conexão de rede e as configurações.`;
      
      if (isRailway) {
        errorMsg += '\n\n⚠️ Railway bloqueia conexões SMTP. Use MAILTRAP_API_TOKEN em vez de SMTP.';
      }
      
      throw new Error(errorMsg);
    } else if (error.code === 'ECONNRESET') {
      throw new Error('Conexão SMTP foi resetada. Tente novamente.');
    } else if (error.code === 'EENVELOPE') {
      throw new Error('Erro no envelope do email. Verifique os endereços de destinatário.');
    }
    
    throw error;
  }
};

const transporter = {
  sendMail: async (mailOptions) => {
    if (mailtrapApiToken && mailtrapApiToken.trim()) {
      try {
        return await sendMailViaMailtrapAPI(mailOptions);
      } catch (apiError) {
        if (smtpUser && smtpPass) {
          console.log('[EMAIL] 🔄 Tentando fallback para SMTP...');
          try {
            const result = await sendMailViaSMTP(mailOptions);
            console.log('[EMAIL] ✅ Email enviado via SMTP (fallback)');
            return result;
          } catch (smtpError) {
            throw new Error(`Falha na API (${apiError.message}) e no SMTP (${smtpError.message})`);
          }
        } else {
          throw apiError;
        }
      }
    } else if (smtpUser && smtpPass) {
      try {
        return await sendMailViaSMTP(mailOptions);
      } catch (smtpError) {
        throw smtpError;
      }
    } else {
      const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME || false;
      let errorMsg = 'Nenhuma configuração de email disponível (API ou SMTP)';
      
      if (isRailway) {
        errorMsg += '\n\n💡 Configure MAILTRAP_API_TOKEN no Railway:';
        errorMsg += '\n   1. Aceda ao Mailtrap: https://mailtrap.io/api-tokens';
        errorMsg += '\n   2. Crie um token com permissão "Send emails"';
        errorMsg += '\n   3. Adicione no Railway: MAILTRAP_API_TOKEN=<token>';
        errorMsg += '\n   4. Opcional: MAILTRAP_API_TYPE=sending (ou sandbox)';
      }
      
      throw new Error(errorMsg);
    }
  },
  verify: (callback) => {
    if (mailtrapApiToken && mailtrapApiToken.trim()) {
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
