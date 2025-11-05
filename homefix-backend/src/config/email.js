const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mailtrapApiToken = process.env.MAILTRAP_API_TOKEN || 'a53352d9f62dfea5564bae9305d46e22';
const mailtrapInboxId = process.env.MAILTRAP_INBOX_ID || '2369461';
const mailtrapApiType = process.env.MAILTRAP_API_TYPE || 'sandbox';
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
  
  if (isRailway) {
    console.error('[EMAIL] ⚠️  AVISO CRÍTICO: Railway bloqueia conexões SMTP!');
    console.error('[EMAIL] 💡 CONFIGURE MAILTRAP_API_TOKEN NO RAILWAY:');
    console.error('[EMAIL]     1. Aceda ao Mailtrap: https://mailtrap.io/api-tokens');
    console.error('[EMAIL]     2. Crie um token com permissão "Send emails"');
    console.error('[EMAIL]     3. No Railway, adicione: MAILTRAP_API_TOKEN=<token>');
    console.error('[EMAIL]     4. Opcional: MAILTRAP_API_TYPE=sending (ou sandbox)');
    console.error('[EMAIL]     5. Reinicie o serviço');
    console.error('[EMAIL]   SMTP falhará com timeout no Railway!');
  }
  
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
} else {
  console.error('[EMAIL] ❌ Configuração incompleta!');
  console.error('[EMAIL] Configure MAILTRAP_API_TOKEN (recomendado) ou SMTP_USER/SMTP_PASS');
  
  if (isRailway) {
    console.error('[EMAIL] ⚠️  NO RAILWAY: MAILTRAP_API_TOKEN é obrigatório!');
    console.error('[EMAIL]   SMTP não funciona no Railway devido a bloqueios de rede');
    console.error('[EMAIL]   Configure no Railway:');
    console.error('[EMAIL]     - MAILTRAP_API_TOKEN=<token_do_mailtrap>');
    console.error('[EMAIL]     - MAILTRAP_API_TYPE=sending (ou sandbox)');
  }
  
  console.error('[EMAIL] Variáveis necessárias para SMTP:');
  console.error('[EMAIL]   - SMTP_HOST (opcional, padrão: sandbox.smtp.mailtrap.io)');
  console.error('[EMAIL]     Exemplos: smtp.gmail.com, sandbox.smtp.mailtrap.io');
  console.error('[EMAIL]   - SMTP_PORT (opcional, padrão: 587 para Gmail, 2525 para Mailtrap)');
  console.error('[EMAIL]   - SMTP_USER (obrigatório - email completo para Gmail)');
  console.error('[EMAIL]   - SMTP_PASS (obrigatório - App Password para Gmail)');
}

const sendMailViaMailtrapAPI = async (mailOptions) => {
  const token = String(mailtrapApiToken || '').trim();
  const inboxId = String(mailtrapInboxId || '2369461').trim();

  if (!token || token.length < 10) {
    throw new Error('MAILTRAP_API_TOKEN não está configurado ou é inválido');
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

  const apiType = mailtrapApiType || 'sending';
  const url = apiType === 'sandbox'
    ? `https://sandbox.api.mailtrap.io/api/send/${inboxId}`
    : `https://send.api.mailtrap.io/api/send`;
  
  console.log(`[EMAIL] URL: ${url}`);
  console.log(`[EMAIL] API Type: ${apiType === 'sending' ? 'Sending API (envio real)' : 'Sandbox API (teste)'}`);
  console.log(`[EMAIL] Token completo (para debug): ${token}`);
  console.log(`[EMAIL] Token length: ${token.length} caracteres`);
  console.log(`[EMAIL] Inbox ID: ${inboxId}`);

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(emailData);
    
    const urlObj = new URL(url);
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    
    if (apiType === 'sandbox') {
      headers['Api-Token'] = token;
      console.log(`[EMAIL] Usando header Api-Token para Sandbox API`);
    } else {
      headers['Authorization'] = `Bearer ${token}`;
      console.log(`[EMAIL] Usando header Authorization para Sending API`);
    }
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: headers,
      timeout: 30000
    };

    console.log(`[EMAIL] Header de autenticação: ${apiType === 'sandbox' ? 'Api-Token' : 'Authorization'}`);
    console.log(`[EMAIL] Token completo: ${token}`);
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
            console.error('[EMAIL] 💡 Para Sandbox API, o token deve vir das configurações do inbox:');
            console.error('[EMAIL]    1. Aceda ao Mailtrap: https://mailtrap.io');
            console.error('[EMAIL]    2. Vá para o seu Sandbox inbox');
            console.error('[EMAIL]    3. Clique em "Settings" → "Integrations" → "API"');
            console.error('[EMAIL]    4. Copie o "Inbox Token" (não o API Token geral)');
            console.error('[EMAIL]    5. Configure no Railway: MAILTRAP_API_TOKEN=<inbox_token>');
            console.error(`[EMAIL]    Token atual: ${token} (${token.length} chars)`);
            console.error(`[EMAIL]    Inbox ID: ${inboxId}`);
            console.error(`[EMAIL]    Endpoint: ${url}`);
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
    console.error(`[EMAIL] ❌ Erro SMTP na porta ${finalPort}:`, error.message);
    console.error(`[EMAIL] Erro completo:`, error);
    
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
        console.error('[EMAIL] ⚠️  Railway pode estar bloqueando conexões SMTP');
        console.error('[EMAIL] 💡 SOLUÇÃO RECOMENDADA: Configure MAILTRAP_API_TOKEN');
        console.error('[EMAIL]   1. Aceda ao Mailtrap: https://mailtrap.io/api-tokens');
        console.error('[EMAIL]   2. Crie um novo token ou use um existente');
        console.error('[EMAIL]   3. Configure no Railway:');
        console.error('[EMAIL]      - MAILTRAP_API_TOKEN=<seu_token>');
        console.error('[EMAIL]      - MAILTRAP_API_TYPE=sending (ou sandbox para testes)');
        console.error('[EMAIL]   4. Se usar sandbox, configure também:');
        console.error('[EMAIL]      - MAILTRAP_INBOX_ID=<id_do_inbox>');
        errorMsg += '\n\n⚠️ Railway bloqueia conexões SMTP. Use MAILTRAP_API_TOKEN em vez de SMTP.';
      } else {
        console.error('[EMAIL] 💡 Recomendação: Use MAILTRAP_API_TOKEN em vez de SMTP');
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
        console.error('[EMAIL] ❌ Erro ao enviar email via API:', apiError.message);
        
        if (apiError.message.includes('401') || apiError.message.includes('Unauthorized')) {
          console.error('[EMAIL] ⚠️  Token Mailtrap inválido ou sem permissões');
          console.error('[EMAIL] 💡 CORREÇÃO NECESSÁRIA:');
          console.error('[EMAIL]    1. Aceda ao Mailtrap: https://mailtrap.io/api-tokens');
          console.error('[EMAIL]    2. Clique no seu token para editar');
          console.error('[EMAIL]    3. Na secção "Permissions", encontre "API/SMTP"');
          console.error('[EMAIL]    4. Marque a checkbox "Admin" ou "Viewer" para API/SMTP');
          console.error('[EMAIL]    5. Guarde as alterações');
          console.error('[EMAIL]    6. Ou configure SMTP como fallback (veja abaixo)');
        }
        
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
          console.error('[EMAIL] 💡 Configure SMTP_USER e SMTP_PASS no Railway para fallback automático');
          throw apiError;
        }
      }
    } else if (smtpUser && smtpPass) {
      const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME || false;
      
      if (isRailway) {
        console.error('[EMAIL] ⚠️  AVISO: Usando SMTP no Railway (pode ter problemas)');
        console.error('[EMAIL] 💡 RECOMENDAÇÃO: Configure MAILTRAP_API_TOKEN no Railway');
        console.error('[EMAIL]   Railway frequentemente bloqueia conexões SMTP');
      }
      
      try {
        return await sendMailViaSMTP(mailOptions);
      } catch (smtpError) {
        console.error('[EMAIL] ❌ Erro SMTP:', smtpError.message);
        
        if (isRailway) {
          console.error('[EMAIL] ⚠️  Railway está bloqueando conexões SMTP');
          console.error('[EMAIL] 💡 SOLUÇÃO OBRIGATÓRIA: Configure MAILTRAP_API_TOKEN');
          console.error('[EMAIL]   1. Aceda ao Mailtrap: https://mailtrap.io/api-tokens');
          console.error('[EMAIL]   2. Crie um token com permissão "Send emails"');
          console.error('[EMAIL]   3. Adicione no Railway: MAILTRAP_API_TOKEN=<token>');
          console.error('[EMAIL]   4. Opcional: MAILTRAP_API_TYPE=sending (ou sandbox)');
          console.error('[EMAIL]   5. Reinicie o serviço no Railway');
        } else {
          console.error('[EMAIL] 💡 Recomendação: Use MAILTRAP_API_TOKEN em vez de SMTP');
        }
        
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
