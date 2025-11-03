const PDFDocument = require('pdfkit');

async function generateInvoicePDF(request, user) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const IVA_RATE = 0.23; // 23% IVA
      const basePrice = Number(request.price) || 0;
      const ivaAmount = basePrice * IVA_RATE;
      const totalPrice = basePrice + ivaAmount;

      const pageWidth = doc.page.width;
      const margin = 50;
      const contentWidth = pageWidth - (margin * 2);

      doc.fontSize(26).fillColor('#ff7a00').text('FATURA', margin, 80, { 
        width: contentWidth, 
        align: 'center' 
      });
      doc.fontSize(12).fillColor('#666666').text('HomeFix - Serviços de Manutenção', { 
        width: contentWidth, 
        align: 'center' 
      });
      doc.moveDown(1.5);

      doc.strokeColor('#ff7a00').lineWidth(2)
         .moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(1);

      doc.fontSize(11).fillColor('#000000').text('DADOS DO CLIENTE', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#333333')
         .text(`Nome: ${user.firstName || ''} ${user.lastName || ''}`.trim())
         .text(`Email: ${user.email || '-'}`)
         .text(`NIF: ${user.nif || 'Não informado'}`)
         .moveDown(1.2);

      doc.fontSize(11).fillColor('#000000').text('DETALHES DO SERVIÇO', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#333333')
         .text(`Serviço: ${request.title || '-'}`)
         .text(`Categoria: ${request.category || '-'}`)
         .text(`Descrição: ${request.description ? request.description.substring(0, 150) + (request.description.length > 150 ? '...' : '') : '-'}`, {
           width: contentWidth
         });

      if (request.completedAt) {
        doc.moveDown(0.3);
        doc.text(`Data de Conclusão: ${new Date(request.completedAt).toLocaleDateString('pt-PT')}`);
      }
      doc.moveDown(1.5);

      doc.fontSize(11).fillColor('#000000').text('VALORES', { underline: true });
      doc.moveDown(0.8);

      const tableY = doc.y;
      const col1X = margin;
      const col2X = pageWidth - margin - 120;
      const colWidth = 120;

      doc.rect(col1X, tableY, contentWidth, 25).fillAndStroke('#f5f5f5', '#cccccc');
      doc.fillColor('#000000').fontSize(10)
         .text('Descrição', col1X + 10, tableY + 7, { width: contentWidth - colWidth - 20 })
         .text('Valor', col2X, tableY + 7, { width: colWidth - 10, align: 'right' });

      let currentY = tableY + 30;

      doc.fillColor('#333333').fontSize(10)
         .text('Valor Base do Serviço', col1X + 10, currentY)
         .text(`€ ${basePrice.toFixed(2)}`, col2X, currentY, { width: colWidth - 10, align: 'right' });
      
      currentY += 22;

      doc.text(`IVA (${(IVA_RATE * 100).toFixed(0)}%)`, col1X + 10, currentY)
         .text(`€ ${ivaAmount.toFixed(2)}`, col2X, currentY, { width: colWidth - 10, align: 'right' });
      
      currentY += 28;

      doc.strokeColor('#cccccc').lineWidth(1)
         .moveTo(col1X, currentY).lineTo(pageWidth - margin, currentY).stroke();
      
      currentY += 10;

      doc.fontSize(13).fillColor('#ff7a00').font('Helvetica-Bold')
         .text('TOTAL A PAGAR', col1X + 10, currentY)
         .text(`€ ${totalPrice.toFixed(2)}`, col2X, currentY, { width: colWidth - 10, align: 'right' });
      
      currentY += 22;

      doc.strokeColor('#ff7a00').lineWidth(2)
         .moveTo(col1X, currentY).lineTo(pageWidth - margin, currentY).stroke();

      doc.font('Helvetica').fontSize(9).fillColor('#666666');
      const footerY = doc.page.height - 100;
      doc.text('Obrigado por utilizar a HomeFix!', margin, footerY, { 
        width: contentWidth, 
        align: 'center' 
      });
      doc.fontSize(8)
         .text('Para qualquer questão, contacte-nos através da aplicação.', { 
           width: contentWidth, 
           align: 'center' 
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateInvoicePDF };
