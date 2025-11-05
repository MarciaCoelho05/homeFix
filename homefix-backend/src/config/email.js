const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configurações da Gmail API
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_SENDER_EMAIL = process.env.GOOGLE_SENDER_EMAIL || 'no-reply@homefix.com';

// Verificar se as credenciais estão configuradas
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
  console.error('[EMAIL] ⚠️  Credenciais do Google não configuradas');
  console.error('[EMAIL] Configure as seguintes variáveis no Railway:');
  console.error('[EMAIL] - GOOGLE_CLIENT_ID');
  console.error('[EMAIL] - GOOGLE_CLIENT_SECRET');
  console.error('[EMAIL] - GOOGLE_REFRESH_TOKEN');
  console.error('[EMAIL] - GOOGLE_SENDER_EMAIL (opcional)');
}

/**
 * Obtém um cliente OAuth2 configurado
 */
function getOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Credenciais do Google não configuradas');
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // Redirect URI (pode ser qualquer uma para refresh token)
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

/**
 * Cria a mensagem de email no formato RFC 2822
 */
function createEmailMessage(mailOptions) {
  const from = mailOptions.from || `"HomeFix" <${GOOGLE_SENDER_EMAIL}>`;
  const to = mailOptions.to;
  const subject = mailOptions.subject || '';
  const text = mailOptions.text || '';
  const html = mailOptions.html || '';

  // Criar o cabeçalho do email
  let message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
  ];

  // Se houver HTML e texto, usar multipart
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
    // Apenas HTML
    message.push('Content-Type: text/html; charset=utf-8');
    message.push('');
    message.push(html);
  } else {
    // Apenas texto
    message.push('Content-Type: text/plain; charset=utf-8');
    message.push('');
    message.push(text);
  }

  const messageString = message.join('\r\n');

  // Codificar em base64url (RFC 4648)
  return Buffer.from(messageString)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const emailTransporter = {
  /**
   * Envia um email usando a Gmail API
   */
  sendMail: async (mailOptions) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      throw new Error('Credenciais do Google não configuradas. Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN no Railway.');
    }

    if (!mailOptions.to) {
      throw new Error('Campo "to" é obrigatório');
    }

    try {
      console.log(`[EMAIL] Tentando enviar email para ${mailOptions.to} via Gmail API`);
      console.log(`[EMAIL] Configuração: Client ID: ${GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`[EMAIL] Configuração: Client Secret: ${GOOGLE_CLIENT_SECRET ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`[EMAIL] Configuração: Refresh Token: ${GOOGLE_REFRESH_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`[EMAIL] Configuração: Sender Email: ${GOOGLE_SENDER_EMAIL}`);

      const oauth2Client = getOAuth2Client();
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Criar a mensagem
      const rawMessage = createEmailMessage({
        ...mailOptions,
        from: mailOptions.from || `"HomeFix" <${GOOGLE_SENDER_EMAIL}>`
      });

      console.log(`[EMAIL] Mensagem criada, tamanho: ${rawMessage.length} caracteres`);

      // Enviar o email
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      });

      console.log(`[EMAIL] ✅ Email enviado com sucesso. MessageId: ${response.data.id}`);
      
      return {
        messageId: response.data.id,
        accepted: [mailOptions.to],
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

      // Erros comuns da Gmail API
      if (error.response?.status === 401) {
        const detailedError = error.response?.data?.error?.message || error.message;
        throw new Error(`Token de autenticação inválido ou expirado (401). Verifique o GOOGLE_REFRESH_TOKEN. Detalhes: ${detailedError}`);
      } else if (error.response?.status === 403) {
        const detailedError = error.response?.data?.error?.message || error.message;
        throw new Error(`Permissão negada (403). Verifique se a Gmail API está habilitada e o escopo 'gmail.send' foi concedido. Detalhes: ${detailedError}`);
      } else if (error.response?.status === 400) {
        const detailedError = error.response?.data?.error?.message || error.message;
        throw new Error(`Requisição inválida (400). Verifique o formato da mensagem. Detalhes: ${detailedError}`);
      } else if (error.response?.status === 429) {
        throw new Error('Limite de taxa excedido (429). Aguarde alguns minutos antes de tentar novamente.');
    }
    
    throw error;
  }
  },

  /**
   * Verifica se a conexão com a Gmail API está funcionando
   */
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

      // Verificar perfil do usuário (teste simples)
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
