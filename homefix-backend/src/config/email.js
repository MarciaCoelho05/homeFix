const https = require('https');

const mailtrapApiToken = process.env.MAILTRAP_API_TOKEN;
const mailtrapInboxId = process.env.MAILTRAP_INBOX_ID;

if (!mailtrapApiToken) {
  console.error('[EMAIL] ⚠️  Configuração Mailtrap incompleta!');
  console.error('[EMAIL] Variável necessária: MAILTRAP_API_TOKEN');
  console.error('[EMAIL] MAILTRAP_API_TOKEN:', mailtrapApiToken ? '✅ definido' : '❌ não definido');
  console.error('[EMAIL] MAILTRAP_INBOX_ID:', mailtrapInboxId ? '✅ definido' : '❌ não definido (opcional)');
}

const sendMailViaMailtrapAPI = async (mailOptions) => {
  if (!mailtrapApiToken) {
    throw new Error('MAILTRAP_API_TOKEN não está configurado');
  }

  const inboxId = mailtrapInboxId || '0';
  const url = `https://sandbox.api.mailtrap.io/api/send/${inboxId}`;

  const emailData = {
    from: {
      email: mailOptions.from || 'no-reply@homefix.com',
      name: 'HomeFix'
    },
    to: Array.isArray(mailOptions.to) 
      ? mailOptions.to.map(email => ({ email }))
      : [{ email: mailOptions.to }],
    subject: mailOptions.subject || 'Sem assunto',
    text: mailOptions.text || '',
    html: mailOptions.html || mailOptions.text || '',
    category: 'HomeFix'
  };

  if (mailOptions.attachments && Array.isArray(mailOptions.attachments)) {
    emailData.attachments = mailOptions.attachments.map(att => ({
      filename: att.filename || 'attachment',
      content: att.content || att.path,
      type: att.contentType || 'application/octet-stream',
      disposition: 'attachment'
    }));
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(emailData);
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailtrapApiToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const result = JSON.parse(responseData || '{}');
          console.log(`[EMAIL] ✅ Email enviado via Mailtrap API: ${result.message_ids?.[0] || 'N/A'}`);
          resolve({
            messageId: result.message_ids?.[0] || 'mailtrap-' + Date.now(),
            accepted: emailData.to.map(t => t.email),
            response: result
          });
        } else {
          const error = new Error(`Mailtrap API error: ${res.statusCode} - ${responseData}`);
          console.error('[EMAIL] ❌ Erro ao enviar email via Mailtrap API:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('[EMAIL] ❌ Erro na requisição Mailtrap API:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

const transporter = {
  sendMail: async (mailOptions) => {
    try {
      return await sendMailViaMailtrapAPI(mailOptions);
    } catch (error) {
      console.error('[EMAIL] ❌ Erro ao enviar email:', error);
      throw error;
    }
  },
  verify: (callback) => {
    if (!mailtrapApiToken) {
      callback(new Error('MAILTRAP_API_TOKEN não está configurado'));
      return;
    }
    console.log('[EMAIL] ✅ Mailtrap API configurado e pronto');
    callback(null, true);
  }
};

transporter.verify((error, success) => {
  if (error) {
    console.error('[EMAIL] ❌ Erro na verificação do Mailtrap API:', error);
  } else {
    console.log('[EMAIL] ✅ Mailtrap API configurado e pronto');
  }
});

module.exports = transporter
