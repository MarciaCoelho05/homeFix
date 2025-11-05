const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mailtrapApiToken = process.env.MAILTRAP_API_TOKEN;
const mailtrapInboxId = process.env.MAILTRAP_INBOX_ID;
const mailtrapApiType = process.env.MAILTRAP_API_TYPE || 'sandbox';
const mailtrapDomain = process.env.MAILTRAP_DOMAIN;

const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME || false;


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
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(emailData);
    const urlObj = new URL(url);
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Api-Token': token
    };
    
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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(responseData || '{}');
            resolve({
              messageId: result.message_ids?.[0] || 'mailtrap-' + Date.now(),
              accepted: toEmails,
              response: result
            });
          } catch (parseError) {
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
      callback(null, true);
    } else {
      callback(new Error('MAILTRAP_API_TOKEN não está configurado'));
    }
  }
};

module.exports = transporter;
