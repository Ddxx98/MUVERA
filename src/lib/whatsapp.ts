import { OrderSnapshot } from './types';
import { formatPaise } from './money';

/**
 * Generates an automated WhatsApp booking deep link with structured order details.
 */
export function generateWhatsAppOrderUrl(order: OrderSnapshot, customPhone?: string, customBusinessName?: string): string {
  const cleanPhone = (customPhone || '').replace(/\D/g, '');
  const bizName = (customBusinessName || 'MUVERA').toUpperCase();

  const itemsList = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.productName}* (${item.size} / ${item.color})\n   Qty: ${item.quantity} | Price: ${formatPaise(item.sellingPricePaise * item.quantity)}`
    )
    .join('\n\n');

  const lines = [
    `🛍️ *NEW ORDER BOOKING — ${bizName}*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🧾 *Order ID:* #${order.orderNo}`,
    `📅 *Date:* ${new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`,
    ``,
    `👤 *CUSTOMER DETAILS:*`,
    `• *Name:* ${order.customerName}`,
    `• *Mobile:* ${order.customerPhone}`,
    ``,
    `📍 *DELIVERY ADDRESS:*`,
    `• *Street:* ${order.shippingAddress.street}`,
    order.shippingAddress.apartment ? `• *Apartment/Suite:* ${order.shippingAddress.apartment}` : null,
    order.shippingAddress.landmark ? `• *Landmark:* ${order.shippingAddress.landmark}` : null,
    `• *City/State:* ${order.shippingAddress.city}, ${order.shippingAddress.state}`,
    `• *Pincode:* ${order.shippingAddress.pincode}`,
    `• *Delivery Mode:* 📦 Express Courier Delivery`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📦 *ITEMIZED PRODUCTS:*`,
    itemsList,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `💰 *Subtotal:* ${formatPaise(order.subtotalPaise)}`,
    order.discountPaise > 0 ? `🏷️ *Coupon Savings (${order.couponCode || 'PROMO'}):* -${formatPaise(order.discountPaise)}` : null,
    `⚡ *Delivery Fee:* ${order.deliveryFeePaise === 0 ? 'FREE' : formatPaise(order.deliveryFeePaise)}`,
    `💳 *GRAND TOTAL PAYABLE:* *${formatPaise(order.totalPaise)}*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📝 *Payment Choice:* ${order.paymentPreference === 'upi_whatsapp' ? '⚡ UPI Instant / QR Scan' : '💵 Cash on Delivery'}`,
    ``,
    `⚡ *Status:* Booked on Website. Please confirm dispatch & send payment confirmation!`,
  ].filter(Boolean) as string[];

  const fullMessage = lines.join('\n');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`;
}

/**
 * Generates an admin-to-customer direct WhatsApp conversation link for order updates.
 */
export function generateAdminCustomerChatUrl(order: OrderSnapshot, messageType: 'confirm' | 'dispatch' | 'delivered'): string {
  const customerPhone = order.customerPhone.replace(/\D/g, '');
  const cleanPhone = customerPhone.length === 10 ? `91${customerPhone}` : customerPhone;

  let message = '';
  if (messageType === 'confirm') {
    message = `Hi ${order.customerName}! 👋 Your order #${order.orderNo} for ${formatPaise(order.totalPaise)} is received at MUVERA. We are currently verifying payment and preparing your package.`;
  } else if (messageType === 'dispatch') {
    message = `📦 Great news ${order.customerName}! Your MUVERA order #${order.orderNo} is packed and handed over for express courier delivery!`;
  } else {
    message = `🎉 Order Delivered! Your order #${order.orderNo} from MUVERA has been delivered. Enjoy your fits! Feel free to reach out to our concierge anytime if you need assistance.`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates an instant WhatsApp concierge checkout link directly from bag items.
 * Allows guest shoppers to complete their purchase on WhatsApp without logging in.
 */
export function generateInstantWhatsAppCartUrl(params: {
  items: Array<{
    title: string;
    size: string;
    color?: string;
    quantity: number;
    sellingPricePaise: number;
  }>;
  subtotalPaise: number;
  discountPaise?: number;
  deliveryFeePaise?: number;
  totalPaise: number;
  couponCode?: string;
  customPhone?: string;
  customBusinessName?: string;
}): string {
  const cleanPhone = (params.customPhone || '').replace(/\D/g, '');
  const bizName = (params.customBusinessName || 'MUVERA').toUpperCase();

  const itemsList = params.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.title}* (${item.size}${item.color ? ` / ${item.color}` : ''})\n   Qty: ${item.quantity} | ${formatPaise(item.sellingPricePaise * item.quantity)}`
    )
    .join('\n\n');

  const lines = [
    `⚡ *INSTANT WHATSAPP ORDER — ${bizName}*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Hello ${bizName} Concierge! I want to order the following items directly via WhatsApp:`,
    ``,
    itemsList,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `💰 *Subtotal:* ${formatPaise(params.subtotalPaise)}`,
    params.discountPaise && params.discountPaise > 0
      ? `🏷️ *Coupon Savings (${params.couponCode || 'PROMO'}):* -${formatPaise(params.discountPaise)}`
      : null,
    `⚡ *Delivery Fee:* ${!params.deliveryFeePaise || params.deliveryFeePaise === 0 ? 'FREE' : formatPaise(params.deliveryFeePaise)}`,
    `💳 *ESTIMATED TOTAL:* *${formatPaise(params.totalPaise)}*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Please confirm stock availability and send payment / delivery confirmation instructions!`,
  ].filter(Boolean) as string[];

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
}
