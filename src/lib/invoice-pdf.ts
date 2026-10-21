import { OrderSnapshot } from './types';
import { formatPaise, calculateGstBreakdown } from './money';

/**
 * Generates and triggers download of a standardized, statutory A4 GST Tax Invoice PDF.
 */
export async function generateInvoicePdf(order: OrderSnapshot): Promise<void> {
  // Dynamically import jsPDF for optimal client-side bundle performance
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = margin;

  // 1. Top Decorative Header Bar
  doc.setFillColor(18, 18, 20); // Luxury obsidian black
  doc.rect(margin, y, contentWidth, 24, 'F');

  doc.setTextColor(245, 197, 24); // Electric Gold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MUVERA LUXURY COMMERCE', margin + 6, y + 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 225);
  doc.text('GSTIN: 29AABCM1234F1Z8 | State: Karnataka (Code: 29)', margin + 6, y + 16);
  doc.text('Indiranagar Dark Store Hub, 100ft Road, Bengaluru, KA 560038', margin + 6, y + 20);

  // Top-Right Tax Invoice Badge
  doc.setFillColor(245, 197, 24);
  doc.roundedRect(pageWidth - margin - 38, y + 5, 34, 14, 2, 2, 'F');
  doc.setTextColor(18, 18, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TAX INVOICE', pageWidth - margin - 21, y + 12, { align: 'center' });
  doc.setFontSize(7);
  doc.text('ORIGINAL FOR RECIPIENT', pageWidth - margin - 21, y + 16, { align: 'center' });

  y += 28;

  // 2. Metadata Grid (Invoice No, Order No, Dates)
  doc.setDrawColor(220, 224, 230);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 105, 115);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE NO:', margin + 4, y + 6);
  doc.text('ORDER REF:', margin + 55, y + 6);
  doc.text('INVOICE DATE:', margin + 105, y + 6);
  doc.text('PAYMENT STATUS:', margin + 145, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(18, 18, 20);
  doc.setFontSize(8.5);
  doc.text(order.invoiceNo || `INV-${order.orderNo}`, margin + 4, y + 12);
  doc.text(`#${order.orderNo}`, margin + 55, y + 12);
  doc.text(new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), margin + 105, y + 12);

  const isPaid = order.paymentStatus === 'paid';
  if (isPaid) {
    doc.setTextColor(16, 120, 50);
  } else {
    doc.setTextColor(180, 83, 9);
  }
  doc.text(order.paymentStatus.toUpperCase().replace('_', ' '), margin + 145, y + 12);

  y += 23;

  // 3. Customer & Shipping Destination
  const boxHeight = 26;
  const colWidth = (contentWidth - 4) / 2;

  // Left Box: Customer Details
  doc.setDrawColor(220, 224, 230);
  doc.setFillColor(252, 252, 253);
  doc.roundedRect(margin, y, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text('BILLED TO (CUSTOMER):', margin + 4, y + 6);

  doc.setTextColor(18, 18, 20);
  doc.setFontSize(9);
  doc.text(order.customerName || 'Valued Customer', margin + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 85, 95);
  doc.text(`Mobile: ${order.customerPhone || 'N/A'}`, margin + 4, y + 17);
  if (order.customerEmail) {
    doc.text(`Email: ${order.customerEmail}`, margin + 4, y + 21);
  }

  // Right Box: Shipping Address
  doc.roundedRect(margin + colWidth + 4, y, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11);
  doc.text('DISPATCH DESTINATION:', margin + colWidth + 8, y + 6);

  doc.setTextColor(18, 18, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const addr = order.shippingAddress;
  const streetLine = `${addr.street}${addr.apartment ? `, ${addr.apartment}` : ''}`;
  const cityLine = `${addr.city}, ${addr.state} - ${addr.pincode}`;
  doc.text(streetLine.substring(0, 48), margin + colWidth + 8, y + 12);
  doc.text(cityLine, margin + colWidth + 8, y + 17);
  doc.text(`Courier Mode: Express Doorstep Delivery`, margin + colWidth + 8, y + 21);

  y += boxHeight + 6;

  // 4. Itemized Table
  // Table Header
  const tableHeaderHeight = 8;
  doc.setFillColor(18, 18, 20);
  doc.rect(margin, y, contentWidth, tableHeaderHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  const colX = {
    sno: margin + 3,
    item: margin + 14,
    size: margin + 98,
    qty: margin + 120,
    price: margin + 142,
    amount: margin + 164,
  };

  doc.text('#', colX.sno, y + 5.5);
  doc.text('ITEM DESCRIPTION', colX.item, y + 5.5);
  doc.text('SIZE / SKU', colX.size, y + 5.5);
  doc.text('QTY', colX.qty, y + 5.5);
  doc.text('UNIT PRICE', colX.price, y + 5.5);
  doc.text('AMOUNT', colX.amount, y + 5.5);

  y += tableHeaderHeight;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const rowHeight = 9;

  order.items.forEach((item, idx) => {
    // Alternating zebra striping
    if (idx % 2 === 1) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(230, 233, 238);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    doc.setTextColor(80, 85, 95);
    doc.text(String(idx + 1), colX.sno, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 18, 20);
    const title = item.productName.length > 42 ? `${item.productName.substring(0, 40)}...` : item.productName;
    doc.text(title, colX.item, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 85, 95);
    doc.text(`${item.size} (${item.sku || 'STD'})`, colX.size, y + 6);
    doc.text(String(item.quantity), colX.qty + 2, y + 6);

    doc.text(formatPaise(item.sellingPricePaise), colX.price, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 18, 20);
    doc.text(formatPaise(item.sellingPricePaise * item.quantity), colX.amount, y + 6);

    y += rowHeight;
  });

  y += 4;

  // 5. Financial Summary Calculation Box
  const summaryWidth = 84;
  const summaryX = pageWidth - margin - summaryWidth;
  const gst = calculateGstBreakdown(order.totalPaise);

  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(220, 224, 230);
  doc.roundedRect(summaryX, y, summaryWidth, 38, 2, 2, 'FD');

  const printSummaryLine = (label: string, value: string, posY: number, isBold = false, isAccent = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(isAccent ? 217 : 80, isAccent ? 119 : 85, isAccent ? 6 : 95);
    doc.text(label, summaryX + 4, posY);
    doc.text(value, summaryX + summaryWidth - 4, posY, { align: 'right' });
  };

  let sumY = y + 6;
  printSummaryLine('Subtotal (Exclusive of GST):', formatPaise(order.subtotalPaise - (gst.cgstPaise + gst.sgstPaise)), sumY);
  sumY += 5;

  if (order.discountPaise > 0) {
    printSummaryLine(`Coupon Discount (${order.couponCode || 'PROMO'}):`, `-${formatPaise(order.discountPaise)}`, sumY, true, true);
    sumY += 5;
  }

  printSummaryLine('Delivery Fee (Express Speed):', order.deliveryFeePaise === 0 ? 'FREE' : formatPaise(order.deliveryFeePaise), sumY);
  sumY += 5;

  printSummaryLine('CGST (6% Statutory):', formatPaise(gst.cgstPaise), sumY);
  sumY += 5;

  printSummaryLine('SGST (6% Statutory):', formatPaise(gst.sgstPaise), sumY);
  sumY += 6;

  // Total Divider & Total Row
  doc.setDrawColor(200, 205, 215);
  doc.line(summaryX + 4, sumY - 2, summaryX + summaryWidth - 4, sumY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(18, 18, 20);
  doc.text('TOTAL PAYABLE:', summaryX + 4, sumY + 3);
  doc.text(formatPaise(order.totalPaise), summaryX + summaryWidth - 4, sumY + 3, { align: 'right' });

  // 6. Left side Tax Summary Box (HSN & Tax Info)
  const taxInfoWidth = contentWidth - summaryWidth - 6;
  doc.roundedRect(margin, y, taxInfoWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 105, 115);
  doc.text('STATUTORY TAX DECLARATION:', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(110, 115, 125);
  doc.text('• HSN Code: 6109 (T-Shirts, Singlets & Vests, Knitted or Crocheted)', margin + 4, y + 12);
  doc.text('• All taxes calculated under GST Act at 12% total apparel rate (6% CGST + 6% SGST).', margin + 4, y + 17);
  doc.text('• Supply origin: Karnataka State Code 29 (Intra-State / Inter-State Supply).', margin + 4, y + 22);
  doc.text('• Statutory electronic invoice under rule 48(4) of CGST Rules.', margin + 4, y + 27);

  y += 44;

  // 7. Footer: Terms & Authorized Signatory
  doc.setDrawColor(220, 224, 230);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(18, 18, 20);
  doc.text('TERMS & POLICY:', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(110, 115, 125);
  doc.text('1. Easy 7-day doorstep size exchange policy applicable from the delivery date.', margin, y + 4);
  doc.text('2. Please retain garment tags and original packaging for valid exchange authorization.', margin, y + 8);
  doc.text('3. For support or courier tracking inquiries, connect via WhatsApp: +91 93809 33170.', margin, y + 12);

  // Signatory Stamp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(18, 18, 20);
  doc.text('For MUVERA LUXURY COMMERCE', pageWidth - margin - 4, y, { align: 'right' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(110, 115, 125);
  doc.text('Authorised Signatory', pageWidth - margin - 4, y + 10, { align: 'right' });
  doc.text('Computer Generated Invoice • No Physical Signature Required', pageWidth - margin - 4, y + 14, { align: 'right' });

  // Trigger browser download
  doc.save(`MUVERA-Tax-Invoice-${order.orderNo}.pdf`);
}
