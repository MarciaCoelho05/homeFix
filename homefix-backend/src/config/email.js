const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_SENDER_EMAIL = process.env.GOOGLE_SENDER_EMAIL || 'no-reply@homefix.com';
const FORCE_EMAIL_TO = 'homefix593@gmail.com';

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email não fornecido ou inválido' };
  }
  
  const toEmail = email.toLowerCase().trim();
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(toEmail)) {
    return { valid: false, reason: 'Formato de email inválido' };
  }
  
  const domain = toEmail.split('@')[1];
  if (!domain) {
    return { valid: false, reason: 'Domínio inválido' };
  }
  
  const blockedDomains = [
    'homefix.com',
    'homefix.pt',
    'example.com',
    'test.com',
    'teste.com',
    'localhost',
    'invalid.com',
  ];
  
  if (blockedDomains.some(blocked => domain === blocked || domain.endsWith('.' + blocked))) {
    return { valid: false, reason: `Domínio bloqueado: ${domain}` };
  }
  
  if (
    toEmail.includes('mailer-daemon') ||
    toEmail.includes('mailer_daemon') ||
    toEmail.includes('noreply') ||
    toEmail.includes('no-reply') ||
    toEmail.includes('postmaster') ||
    toEmail.includes('abuse') ||
    toEmail.includes('mail-delivery') ||
    domain.includes('mailer-daemon')
  ) {
    return { valid: false, reason: 'Endereço bloqueado (mailer-daemon)' };
  }
  
  const domainParts = domain.split('.');
  if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
    return { valid: false, reason: 'Domínio inválido' };
  }
  
  return { valid: true };
}

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
  console.error('[EMAIL] ⚠️  Credenciais do Google não configuradas');
  console.error('[EMAIL] Configure as seguintes variáveis no Railway:');
  console.error('[EMAIL] - GOOGLE_CLIENT_ID');
  console.error('[EMAIL] - GOOGLE_CLIENT_SECRET');
  console.error('[EMAIL] - GOOGLE_REFRESH_TOKEN');
  console.error('[EMAIL] - GOOGLE_SENDER_EMAIL (opcional)');
}

function getOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Credenciais do Google não configuradas');
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

function createEmailMessage(mailOptions) {
  const from = mailOptions.from || `"HomeFix" <${GOOGLE_SENDER_EMAIL}>`;
  const to = mailOptions.to;
  const originalTo = mailOptions.originalTo || to;
  const subject = mailOptions.subject || '';
  let text = mailOptions.text || '';
  let html = mailOptions.html || '';

  if (originalTo && originalTo !== to) {
    const redirectNote = `\n\n---\n⚠️ NOTA: Este email foi originalmente destinado a: ${originalTo}\nTodos os emails são redirecionados para ${to} para fins de monitorização.\n---\n`;
    text = text + redirectNote;
    
    if (html) {
      const htmlNote = `<div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;"><strong>⚠️ NOTA:</strong> Este email foi originalmente destinado a: <strong>${originalTo}</strong><br>Todos os emails são redirecionados para <strong>${to}</strong> para fins de monitorização.</div>`;
      html = html.replace('</body>', htmlNote + '</body>');
    }
  }

  let message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
  ];

  if (html && text) {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    message.push('MIME-Version: 1.0');
    message.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    message.push('');
    message.push(`--${boundary}`);
    message.push('Content-Type: text/plain; charset=utf-8');
    message.push('Content-Transfer-Encoding: 7bit');
    message.push('');
    message.push(text);
    message.push(`--${boundary}`);
    message.push('Content-Type: text/html; charset=utf-8');
    message.push('Content-Transfer-Encoding: 7bit');
    message.push('');
    message.push(html);
    message.push(`--${boundary}--`);
  } else if (html) {
    message.push('Content-Type: text/html; charset=utf-8');
    message.push('');
    message.push(html);
} else {
    message.push('Content-Type: text/plain; charset=utf-8');
    message.push('');
    message.push(text);
  }

        const messageString = message.join('\r\n');

        return Buffer.from(messageString)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const emailTransporter = {
        sendMail: async (mailOptions) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      throw new Error('Credenciais do Google não configuradas. Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN no Railway.');
    }

    if (!mailOptions.to) {
      throw new Error('Campo "to" é obrigatório');
    }

    const originalTo = mailOptions.to;
    
    const forcedTo = FORCE_EMAIL_TO;
    mailOptions.to = forcedTo;
    
    console.log(`[EMAIL] 🔄 Redirecionando email:`);
    console.log(`[EMAIL]    Destinatário original: ${originalTo}`);
    console.log(`[EMAIL]    Destinatário forçado: ${forcedTo}`);

    const validation = validateEmail(forcedTo);
    if (!validation.valid) {
      console.warn(`[EMAIL] ⚠️ Email bloqueado: ${forcedTo} - Razão: ${validation.reason}`);
      throw new Error(`Email inválido ou bloqueado: ${validation.reason}`);
    }

    try {
      console.log(`[EMAIL] Tentando enviar email para ${mailOptions.to} via Gmail API`);
      console.log(`[EMAIL] Configuração: Client ID: ${GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`[EMAIL] Configuração: Client Secret: ${GOOGLE_CLIENT_SECRET ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`[EMAIL] Configuração: Refresh Token: ${GOOGLE_REFRESH_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`[EMAIL] Configuração: Sender Email: ${GOOGLE_SENDER_EMAIL}`);

      const oauth2Client = getOAuth2Client();
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const rawMessage = createEmailMessage({
        ...mailOptions,
        from: mailOptions.from || `"HomeFix" <${GOOGLE_SENDER_EMAIL}>`,
        originalTo: originalTo
      });

      console.log(`[EMAIL] Mensagem criada, tamanho: ${rawMessage.length} caracteres`);

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      });

      console.log(`[EMAIL] ✅ Email enviado com sucesso. MessageId: ${response.data.id}`);
      console.log(`[EMAIL] 📬 Destinatário original: ${originalTo}`);
      console.log(`[EMAIL] 📬 Destinatário atual (forçado): ${mailOptions.to}`);
      console.log(`[EMAIL] 📧 Remetente: ${GOOGLE_SENDER_EMAIL}`);
      console.log(`[EMAIL] 📋 Assunto: ${mailOptions.subject}`);
      console.log(`[EMAIL] ⚠️ IMPORTANTE: Todos os emails são redirecionados para ${FORCE_EMAIL_TO}`);
      
      try {
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: response.data.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });
        console.log(`[EMAIL] 📨 Detalhes do email enviado:`, {
          threadId: messageDetails.data.threadId,
          labelIds: messageDetails.data.labelIds,
          sizeEstimate: messageDetails.data.sizeEstimate
        });
      } catch (detailError) {
        console.warn(`[EMAIL] ⚠️ Não foi possível obter detalhes do email:`, detailError.message);
      }
      
      return {
        messageId: response.data.id,
        accepted: [mailOptions.to],
        originalTo: originalTo,
        forcedTo: mailOptions.to,
        response: response.data
      };
  } catch (error) {
      console.error('[EMAIL] ❌ Erro ao enviar email');
      console.error('[EMAIL] Mensagem de erro:', error.message);
      console.error('[EMAIL] Tipo de erro:', error.constructor.name);
      console.error('[EMAIL] Stack:', error.stack);
      
      if (error.response) {
        console.error('[EMAIL] Status HTTP:', error.response.status);
        console.error('[EMAIL] Status Text:', error.response.statusText);
        console.error('[EMAIL] Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }

      if (error.response?.status === 401) {
        const detailedError = error.response?.data?.error?.message || error.message;
        throw new Error(`Token de autenticação inválido ou expirado (401). Verifique o GOOGLE_REFRESH_TOKEN. Detalhes: ${detailedError}`);
      } else if (error.response?.status === 403) {
        const detailedError = error.response?.data?.error?.message || error.message;
        throw new Error(`Permissão negada (403). Verifique se a Gmail API está habilitada e o escopo 'gmail.send' foi concedido. Detalhes: ${detailedError}`);
      } else if (error.response?.status === 400) {
        const errorData = error.response?.data;
        const errorCode = errorData?.error;
        
        if (errorCode === 'invalid_grant') {
          throw new Error(`Refresh Token inválido (invalid_grant). O GOOGLE_REFRESH_TOKEN precisa ser obtido novamente no OAuth Playground. Siga as instruções em GET_REFRESH_TOKEN.md`);
        }
        
        const detailedError = errorData?.error_description || errorData?.error || error.message;
        throw new Error(`Requisição inválida (400). Verifique o formato da mensagem. Detalhes: ${detailedError}`);
      } else if (error.response?.status === 429) {
        throw new Error('Limite de taxa excedido (429). Aguarde alguns minutos antes de tentar novamente.');
    }
    
    throw error;
  }
  },

        verify: async (callback) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      const error = new Error('Credenciais do Google não configuradas');
      if (callback) {
        callback(error);
      } else {
        throw error;
      }
      return;
    }

    try {
      const oauth2Client = getOAuth2Client();
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      await gmail.users.getProfile({ userId: 'me' });
      
      console.log('[EMAIL] ✅ Gmail API configurada e pronta');
      
      if (callback) {
      callback(null, true);
    } else {
        return true;
      }
    } catch (error) {
      console.error('[EMAIL] Erro na verificação Gmail API:', error.message);
      
      if (callback) {
        callback(error);
      } else {
        throw error;
      }
    }
  }
};

module.exports = emailTransporter;
module.exports.validateEmail = validateEmail;
