
import nodemailer from 'nodemailer';

// Transporter configurado com Mailtrap
const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: 'e3a25021230e80',
    pass: 'a523a19ad55bdc'
  }
});

// Enviar e-mail de aceitação
export async function sendAcceptanceEmail(clientEmail, technicianEmail, request) {
  const html = `
    <h3>Pedido Aceite - ${request.title}</h3>
    <p>O seu pedido de manutenção foi aceite pelo técnico.</p>
    <p><strong>Categoria:</strong> ${request.category}</p>
    <p><strong>Data agendada:</strong> ${request.scheduledAt}</p>
  `;

  const mailOptions = {
    from: '"HomeFix" <no-reply@homefix.com>',
    to: [clientEmail, technicianEmail],
    subject: 'Pedido Aceite - HomeFix',
    html
  };

  return transporter.sendMail(mailOptions);
}

// Enviar e-mail com fatura (PDF em anexo)
export async function sendCompletionEmail(clientEmail, pdfBuffer) {
  const mailOptions = {
    from: '"HomeFix" <no-reply@homefix.com>',
    to: clientEmail,
    subject: 'Serviço Concluído - Fatura Anexa',
    text: 'O seu serviço foi concluído. A fatura encontra-se em anexo.',
    attachments: [
      {
        filename: 'fatura-homefix.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  return transporter.sendMail(mailOptions);
}
