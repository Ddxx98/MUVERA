import { OrderSnapshot } from './types';
import { formatPaise } from './money';
import { env } from '@/config/env';

/**
 * Generates an automated WhatsApp booking deep link with structured order details.
 */
export function generateWhatsAppOrderUrl(order: OrderSnapshot): string {
  const cleanPhone = env.whatsappNumber.replace(/\D/g, '');

  const itemsList = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.productName}* (${item.size} / ${item.color})\n   Qty: ${item.quantity} | Price: ${formatPaise(item.sellingPricePaise * item.quantity)}`
    )
    .join('\n\n');

  const lines = [
    `🛍️ *NEW ORDER BOOKING — ${env.businessName.toUpperCase()}*`,
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
    `• *Delivery Mode:* ${order.deliveryMethod === 'express_60' ? '⚡ Express 60-Minute Delivery' : '📦 Standard Courier'}`,
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
    message = `Hi ${order.customerName}! 👋 Your order #${order.orderNo} for ${formatPaise(order.totalPaise)} is received at MUVERA. We are currently verifying payment and preparing your package at Indiranagar Dark Store.`;
  } else if (messageType === 'dispatch') {
    message = `⚡ Great news ${order.customerName}! Your MUVERA order #${order.orderNo} is packed and rider is out for 60-minute express delivery!`;
  } else {
    message = `🎉 Order Delivered! Your order #${order.orderNo} from MUVERA has been delivered. Enjoy your fits! Reach out if you need size exchanges within 7 days.`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
