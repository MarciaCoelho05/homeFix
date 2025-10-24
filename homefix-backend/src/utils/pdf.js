const PDFDocument = require('pdfkit');
const getStream = require('get-stream');

async function generateInvoicePDF(request, user) {
  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];

  doc.on('data', buffers.push.bind(buffers));

  doc.fontSize(18).text('Fatura - HomeFix', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Cliente: ${user.firstName || ''} ${user.lastName || ''}`.trim());
  doc.text(`Email: ${user.email || '-'}`);
  doc.text(`Servico: ${request.title || '-'}`);
  doc.text(`Categoria: ${request.category || '-'}`);
  if (request.price != null) {
    doc.text(`Preco: EUR ${Number(request.price).toFixed(2)}`);
  }
  if (request.completedAt) {
    doc.text(`Concluido em: ${new Date(request.completedAt).toLocaleString()}`);
  } else if (request.scheduledAt) {
    doc.text(`Data preferencial: ${new Date(request.scheduledAt).toLocaleString()}`);
  }

  doc.moveDown();
  doc.text('Obrigado por utilizar a HomeFix!', { align: 'center' });

  doc.end();

  const buffer = await getStream.buffer(doc);
  return buffer;
}

module.exports = { generateInvoicePDF };
