
import PDFDocument from 'pdfkit';
import getStream from 'get-stream';

export async function generateInvoicePDF(request, user) {
  const doc = new PDFDocument();
  let buffers = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  // Conteúdo da fatura
  doc.fontSize(18).text('Fatura - HomeFix', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Cliente: ${user.firstName} ${user.lastName}`);
  doc.text(`Email: ${user.email}`);
  doc.text(`Serviço: ${request.title}`);
  doc.text(`Categoria: ${request.category}`);
  doc.text(`Preço: €${request.price?.toFixed(2) ?? 'N/D'}`);
  doc.text(`Data: ${new Date(request.scheduledAt).toLocaleDateString()}`);
  doc.moveDown();
  doc.text('Obrigado por usar a HomeFix!', { align: 'center' });

  doc.end();

  return await getStream.buffer(doc);
}
