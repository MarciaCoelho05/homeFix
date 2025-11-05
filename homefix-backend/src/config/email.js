const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mailtrapApiToken = process.env.MAILTRAP_API_TOKEN;
const mailtrapInboxId = process.env.MAILTRAP_INBOX_ID;
const mailtrapApiType = process.env.MAILTRAP_API_TYPE || 'sandbox';
const mailtrapDomain = process.env.MAILTRAP_DOMAIN;

const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME || false;

if (mailtrapApiToken && mailtrapApiToken.trim()) {
  console.log('[EMAIL] ✅ Usando Mailtrap API');
  console.log('[EMAIL]   API Token:', mailtrapApiToken ? '✅ definido' : '❌ não definido');
  console.log('[EMAIL]   API Type:', mailtrapApiType === 'sending' ? 'Sending API (envio real)' : 'Sandbox API (teste)');
  if (mailtrapApiType === 'sandbox') {
    console.log('[EMAIL]   Inbox ID:', mailtrapInboxId);
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

const transporter = {
  sendMail: async (mailOptions) => {
    if (mailtrapApiToken && mailtrapApiToken.trim()) {
      return await sendMailViaMailtrapAPI(mailOptions);
    } else {
      const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME || false;
      let errorMsg = 'MAILTRAP_API_TOKEN não está configurado';
      
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
    } else {
      callback(new Error('MAILTRAP_API_TOKEN não está configurado'));
    }
  }
};

console.log('[EMAIL] ✅ Transporter criado');

module.exports = transporter;
