import { env } from '@/config/env';

/**
 * Generates an official UPI Payment URL (UPI Intent).
 * This can be opened directly on mobile UPI apps (Google Pay, PhonePe, Paytm, BHIM).
 */
export function generateUpiPaymentUrl(
  amountRupees: number,
  orderNo: string,
  customUpiId?: string,
  customMerchantName?: string
): string {
  const params = new URLSearchParams({
    pa: (customUpiId || env.businessUpiId).trim(),
    pn: (customMerchantName || env.businessName).trim(),
    am: amountRupees.toFixed(2),
    cu: 'INR',
    tn: `MUVERA Order ${orderNo}`,
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Generates a high-resolution QR code image URL for on-screen scanning.
 */
export function generateUpiQrCodeUrl(
  amountRupees: number,
  orderNo: string,
  customUpiId?: string,
  customMerchantName?: string
): string {
  const upiIntent = generateUpiPaymentUrl(amountRupees, orderNo, customUpiId, customMerchantName);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(upiIntent)}`;
}
