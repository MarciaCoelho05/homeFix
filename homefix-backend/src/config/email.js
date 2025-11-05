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
  console.log('[EMAIL] ✅ Usando SMTP');
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
  
  if (process.env.NODE_ENV === 'production') {
    console.log('[EMAIL] ⚠️  Em produção, Railway pode bloquear conexões SMTP');
    console.log('[EMAIL]   Se tiver problemas, configure MAILTRAP_API_TOKEN');
  }
} else {
  console.error('[EMAIL] ❌ Configuração incompleta!');
  console.error('[EMAIL] Configure MAILTRAP_API_TOKEN (recomendado) ou SMTP_USER/SMTP_PASS');
  console.error('[EMAIL] Variáveis necessárias para SMTP:');
  console.error('[EMAIL]   - SMTP_HOST (opcional, padrão: sandbox.smtp.mailtrap.io)');
  console.error('[EMAIL]     Exemplos: smtp.gmail.com, sandbox.smtp.mailtrap.io');
  console.error('[EMAIL]   - SMTP_PORT (opcional, padrão: 587 para Gmail, 2525 para Mailtrap)');
  console.error('[EMAIL]   - SMTP_USER (obrigatório - email completo para Gmail)');
  console.error('[EMAIL]   - SMTP_PASS (obrigatório - App Password para Gmail)');
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
          
          if (res.statusCode === 401) {
            console.error('[EMAIL] ❌ ERRO 401: Token não autorizado!');
            console.error('[EMAIL] 💡 Verifique no Mailtrap:');
            console.error('[EMAIL]    1. Settings → API Tokens');
            console.error('[EMAIL]    2. Confirme que o token está correto e ativo');
            console.error('[EMAIL]    3. Gere um novo token se necessário');
            console.error('[EMAIL]    4. Verifique se o token tem permissão "Send emails"');
            console.error(`[EMAIL]    Token atual: ${token.substring(0, 10)}... (${token.length} chars)`);
            console.error(`[EMAIL]    Inbox ID: ${inboxId}`);
          }
          
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
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
  
  console.log(`[EMAIL] Configurando SMTP: ${smtpHost}`);
  console.log(`[EMAIL] SMTP_USER: ${smtpUser ? '✅ definido' : '❌ não definido'}`);
  console.log(`[EMAIL] SMTP_PASS: ${smtpPass ? '✅ definido' : '❌ não definido'}`);
  
  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP_USER e SMTP_PASS são obrigatórios para envio via SMTP');
  }
  
  // Detectar provedor e configurar automaticamente
  const isGmail = smtpHost.includes('gmail.com');
  const isMailtrap = smtpHost.includes('mailtrap.io');
  
  let finalPort = smtpPort;
  let isSecure = false;
  let useStartTLS = false;
  let tlsConfig = {};
  
  if (isGmail) {
    // Configuração para Gmail
    finalPort = smtpPort || 587; // Porta padrão do Gmail (STARTTLS)
    isSecure = finalPort === 465; // Porta 465 usa SSL direto
    useStartTLS = finalPort === 587; // Porta 587 usa STARTTLS
    tlsConfig = {
      rejectUnauthorized: true, // Gmail requer certificados válidos
    };
    console.log(`[EMAIL] 📧 Configuração Gmail detectada`);
    console.log(`[EMAIL] ⚠️  IMPORTANTE: Use App Password do Gmail, não a senha normal!`);
    console.log(`[EMAIL] 💡 Como obter: Google Account → Segurança → Verificação em 2 etapas → Senhas de app`);
  } else if (isMailtrap) {
    // Configuração para Mailtrap
    finalPort = smtpPort || 2525;
    isSecure = false;
    useStartTLS = true;
    tlsConfig = {
      rejectUnauthorized: false, // Mailtrap sandbox aceita certificados auto-assinados
    };
    console.log(`[EMAIL] 📧 Configuração Mailtrap detectada`);
  } else {
    // Configuração genérica - tenta detectar pela porta
    finalPort = smtpPort || 587;
    isSecure = finalPort === 465;
    useStartTLS = finalPort === 587 || finalPort === 25;
    tlsConfig = {
      rejectUnauthorized: false, // Aceita certificados auto-assinados por padrão
    };
    console.log(`[EMAIL] 📧 Configuração SMTP genérica`);
  }
  
  console.log(`[EMAIL] Porta: ${finalPort}, secure=${isSecure}, requireTLS=${useStartTLS}`);
  
  try {
    const smtpTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: finalPort,
      secure: isSecure, // true para SSL/TLS (porta 465), false para STARTTLS
      requireTLS: useStartTLS, // true para portas que usam STARTTLS
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: tlsConfig,
      connectionTimeout: 30000, // 30 segundos
      greetingTimeout: 30000,
      socketTimeout: 30000,
      debug: process.env.NODE_ENV === 'development', // Ativa debug em desenvolvimento
      logger: process.env.NODE_ENV === 'development', // Loga em desenvolvimento
    });
    
    // Verificar conexão antes de enviar
    console.log(`[EMAIL] Verificando conexão SMTP...`);
    await smtpTransporter.verify();
    console.log(`[EMAIL] ✅ Conexão SMTP verificada com sucesso`);
    
    console.log(`[EMAIL] Enviando email para: ${mailOptions.to}`);
    const result = await smtpTransporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Email enviado via SMTP (porta ${finalPort})`);
    console.log(`[EMAIL] Message ID: ${result.messageId || 'N/A'}`);
    return result;
  } catch (error) {
    console.error(`[EMAIL] ❌ Erro SMTP na porta ${finalPort}:`, error.message);
    console.error(`[EMAIL] Erro completo:`, error);
    
    // Mensagens de erro mais específicas
    if (error.code === 'EAUTH') {
      if (isGmail) {
        throw new Error('Erro de autenticação Gmail. Verifique se está a usar App Password (não a senha normal). Para obter: Google Account → Segurança → Verificação em 2 etapas → Senhas de app');
      } else {
        throw new Error('Erro de autenticação SMTP. Verifique SMTP_USER e SMTP_PASS.');
      }
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      throw new Error(`Não foi possível conectar ao servidor SMTP ${smtpHost}:${finalPort}. Verifique a conexão de rede e as configurações.`);
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
