import QRCode from 'qrcode';
import { env } from '@/config/env';

export interface UpiPaymentParams {
  amountRupees: number;
  orderNo?: string;
  upiId?: string;
  payeeName?: string;
  note?: string;
}

/**
 * Builds an official NPCI-compliant UPI Payment Intent URI.
 * Format: upi://pay?pa=<upi_id>&pn=<payee_name>&am=<amount>&cu=INR&tn=<note>
 * Compatible with all major UPI apps (Google Pay, PhonePe, Paytm, BHIM, Cred, etc.).
 */
export function buildUpiPaymentUri({
  amountRupees,
  orderNo,
  upiId,
  payeeName,
  note,
}: UpiPaymentParams): string {
  const pa = (upiId || env.businessUpiId || '').trim();
  const pn = (payeeName || env.businessName || 'MUVERA').trim();
  const tn = (note || (orderNo ? `MUVERA Order ${orderNo}` : 'MUVERA Order')).slice(0, 50);

  const params = new URLSearchParams({
    pa,
    pn,
    cu: 'INR',
    tn,
  });

  const num = Number(amountRupees);
  if (Number.isFinite(num) && num > 0) {
    params.set('am', num.toFixed(2));
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * Backward-compatible helper for generating UPI deep link string.
 */
export function generateUpiPaymentUrl(
  amountRupees: number,
  orderNo: string,
  customUpiId?: string,
  customMerchantName?: string
): string {
  return buildUpiPaymentUri({
    amountRupees,
    orderNo,
    upiId: customUpiId,
    payeeName: customMerchantName,
  });
}

/**
 * Generates an in-memory base64 Data URL for the QR code image.
 * Runs instantly without external third-party API dependencies or network latency.
 */
export async function generateUpiQrDataUrl(params: UpiPaymentParams): Promise<string> {
  const uri = buildUpiPaymentUri(params);
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}
