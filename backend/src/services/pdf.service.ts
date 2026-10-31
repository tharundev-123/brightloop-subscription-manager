import PDFDocument from 'pdfkit';
import { Response } from 'express';

export function generateInvoicePdf(invoice: any, res: Response) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Stream directly to HTTP response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${invoice.invoiceNumber}.pdf"`
  );

  doc.pipe(res);

  // Header / Brand
  doc
    .fillColor('#4f46e5')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('BRIGHTLOOP SOFTWARE', 50, 50);

  doc
    .fillColor('#64748b')
    .fontSize(9)
    .font('Helvetica')
    .text('Automated Subscription & Cloud Billing', 50, 75)
    .text('support@brightloop.io | https://brightloop.io', 50, 88);

  // Invoice Meta on Right
  doc
    .fillColor('#0f172a')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('INVOICE', 380, 50, { align: 'right' });

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#475569')
    .text(`Invoice #: ${invoice.invoiceNumber}`, 380, 72, { align: 'right' })
    .text(`Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 380, 86, { align: 'right' })
    .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 380, 100, { align: 'right' })
    .text(`Status: ${invoice.status}`, 380, 114, { align: 'right' });

  doc.moveTo(50, 140).lineTo(545, 140).strokeColor('#e2e8f0').stroke();

  // Billed To & Subscription Details
  doc
    .fillColor('#64748b')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('BILLED TO:', 50, 155);

  doc
    .fillColor('#0f172a')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(invoice.customer?.name || 'Customer', 50, 170);

  doc
    .fillColor('#475569')
    .fontSize(9)
    .font('Helvetica')
    .text(invoice.customer?.email || '', 50, 185);

  doc
    .fillColor('#64748b')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('SUBSCRIPTION REF:', 380, 155, { align: 'right' });

  doc
    .fillColor('#4f46e5')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(invoice.subscription?.subscriptionNumber || 'N/A', 380, 170, { align: 'right' });

  doc
    .fillColor('#475569')
    .fontSize(9)
    .font('Helvetica')
    .text(`Period: ${invoice.billingPeriod}`, 380, 185, { align: 'right' });

  // Table Headers
  const tableTop = 220;
  doc
    .rect(50, tableTop, 495, 22)
    .fillColor('#f8fafc')
    .fill();

  doc
    .fillColor('#475569')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('DESCRIPTION', 60, tableTop + 6)
    .text('QTY', 300, tableTop + 6, { align: 'center', width: 40 })
    .text('PRICE', 350, tableTop + 6, { align: 'right', width: 60 })
    .text('TAX', 420, tableTop + 6, { align: 'right', width: 50 })
    .text('TOTAL', 480, tableTop + 6, { align: 'right', width: 55 });

  let y = tableTop + 28;

  // Lines
  invoice.lines.forEach((line: any) => {
    doc
      .fillColor('#1e293b')
      .fontSize(9)
      .font('Helvetica')
      .text(line.description, 60, y, { width: 230 })
      .text(String(line.quantity), 300, y, { align: 'center', width: 40 })
      .text(`$${line.unitPrice.toFixed(2)}`, 350, y, { align: 'right', width: 60 })
      .text(`$${line.taxAmount.toFixed(2)}`, 420, y, { align: 'right', width: 50 })
      .text(`$${line.lineTotal.toFixed(2)}`, 480, y, { align: 'right', width: 55 });

    y += 20;
    doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor('#f1f5f9').stroke();
  });

  // Totals Area
  const totalsY = Math.max(y + 20, 360);

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#475569')
    .text('Subtotal:', 380, totalsY, { align: 'right', width: 70 })
    .text(`$${invoice.subtotal.toFixed(2)}`, 460, totalsY, { align: 'right', width: 75 });

  doc
    .text('Tax Total:', 380, totalsY + 16, { align: 'right', width: 70 })
    .text(`$${invoice.taxTotal.toFixed(2)}`, 460, totalsY + 16, { align: 'right', width: 75 });

  if (invoice.discountTotal > 0) {
    doc
      .fillColor('#16a34a')
      .text('Discount:', 380, totalsY + 32, { align: 'right', width: 70 })
      .text(`-$${invoice.discountTotal.toFixed(2)}`, 460, totalsY + 32, { align: 'right', width: 75 });
  }

  const grandTotalY = invoice.discountTotal > 0 ? totalsY + 52 : totalsY + 36;

  doc
    .rect(370, grandTotalY - 4, 175, 26)
    .fillColor('#f8fafc')
    .fill();

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text('Total Due:', 380, grandTotalY + 3, { align: 'right', width: 70 })
    .text(`$${invoice.totalAmount.toFixed(2)}`, 460, grandTotalY + 3, { align: 'right', width: 75 });

  // Paid & Outstanding
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#16a34a')
    .text(`Paid: $${invoice.paidAmount.toFixed(2)}`, 380, grandTotalY + 30, { align: 'right', width: 155 });

  doc
    .font('Helvetica-Bold')
    .fillColor(invoice.outstandingAmount > 0 ? '#e11d48' : '#16a34a')
    .text(`Outstanding Balance: $${invoice.outstandingAmount.toFixed(2)}`, 320, grandTotalY + 44, { align: 'right', width: 215 });

  // Footer
  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#94a3b8')
    .text('Thank you for choosing Brightloop Software. Payment terms apply as agreed upon contract signature.', 50, 720, {
      align: 'center',
      width: 495,
    });

  doc.end();
}

