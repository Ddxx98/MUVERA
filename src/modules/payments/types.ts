export type PaymentProviderType = 'whatsapp_upi' | 'razorpay' | 'cod';

export interface CreatePaymentIntentInput {
  orderId: string;
  orderNo: string;
  amountPaise: number;
  currency?: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  notes?: Record<string, string>;
}

export interface PaymentIntentResult {
  intentId: string;
  provider: PaymentProviderType;
  amountPaise: number;
  currency: string;
  status: 'created' | 'pending';
  whatsappLink?: string;
  upiQrString?: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
}

export interface PaymentVerificationInput {
  paymentId: string;
  orderId: string;
  signature?: string;
  rawPayload?: unknown;
}

export interface PaymentVerificationResult {
  verified: boolean;
  paymentId: string;
  orderId: string;
  amountPaise: number;
  status: 'captured' | 'failed' | 'pending';
  method?: string;
}

export interface RefundInput {
  paymentId: string;
  orderId: string;
  amountPaise: number;
  reason: string;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  amountPaise: number;
  status: 'processed' | 'pending' | 'failed';
}

export interface PaymentProvider {
  readonly name: PaymentProviderType;
  createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  verifyPayment(input: PaymentVerificationInput): Promise<PaymentVerificationResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}
