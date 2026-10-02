import { PaymentProvider, CreatePaymentIntentInput, PaymentIntentResult, PaymentVerificationInput, PaymentVerificationResult, RefundInput, RefundResult } from '../types';
import { clientEnv } from '@/config/env.client';

export class WhatsAppUpiPaymentProvider implements PaymentProvider {
  readonly name = 'whatsapp_upi' as const;

  async createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    const amountRupees = input.amountPaise / 100;
    const cleanPhone = clientEnv.whatsappNumber.replace(/\D/g, '');

    const upiParams = new URLSearchParams({
      pa: clientEnv.businessUpiId,
      pn: clientEnv.businessName,
      am: amountRupees.toFixed(2),
      cu: 'INR',
      tn: `MUVERA Order ${input.orderNo}`,
    });
    const upiQrString = `upi://pay?${upiParams.toString()}`;

    const text = `🛍️ *ORDER BOOKING & PAYMENT — ${clientEnv.businessName}*\n\n` +
      `🧾 *Order ID:* #${input.orderNo}\n` +
      `👤 *Customer:* ${input.customer.name} (${input.customer.phone})\n` +
      `💰 *Amount Payable:* ₹${amountRupees.toLocaleString('en-IN')}\n\n` +
      `⚡ *UPI ID:* ${clientEnv.businessUpiId}\n` +
      `Please confirm dispatch and receipt of payment!`;

    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    return {
      intentId: `intent_wa_${input.orderId}_${Date.now()}`,
      provider: this.name,
      amountPaise: input.amountPaise,
      currency: input.currency || 'INR',
      status: 'pending',
      whatsappLink,
      upiQrString,
    };
  }

  async verifyPayment(input: PaymentVerificationInput): Promise<PaymentVerificationResult> {
    // WhatsApp/UPI verification is confirmed by warehouse admin or customer payment screenshot upload
    return {
      verified: true,
      paymentId: input.paymentId || `upi_txn_${Date.now()}`,
      orderId: input.orderId,
      amountPaise: 0,
      status: 'captured',
      method: 'upi_intent',
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      refundId: `rfnd_upi_${Date.now()}`,
      paymentId: input.paymentId,
      amountPaise: input.amountPaise,
      status: 'processed',
    };
  }
}
