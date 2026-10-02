import { PaymentProvider, PaymentProviderType, CreatePaymentIntentInput, PaymentIntentResult, PaymentVerificationInput, PaymentVerificationResult, RefundInput, RefundResult } from './types';
import { WhatsAppUpiPaymentProvider } from './providers/whatsapp-upi';
import { RazorpayPaymentProvider } from './providers/razorpay';
import { serverEnv } from '@/config/env.server';

class PaymentService {
  private providers: Map<PaymentProviderType, PaymentProvider> = new Map();

  constructor() {
    this.registerProvider(new WhatsAppUpiPaymentProvider());
    this.registerProvider(new RazorpayPaymentProvider());
  }

  registerProvider(provider: PaymentProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(preference?: PaymentProviderType): PaymentProvider {
    if (preference && this.providers.has(preference)) {
      return this.providers.get(preference)!;
    }
    // If Razorpay keys are configured and requested, use Razorpay; otherwise default to WhatsApp UPI
    if (serverEnv.RAZORPAY_KEY_ID && serverEnv.RAZORPAY_KEY_SECRET && preference === 'razorpay') {
      return this.providers.get('razorpay')!;
    }
    return this.providers.get('whatsapp_upi')!;
  }

  async createIntent(
    input: CreatePaymentIntentInput,
    preferredProvider?: PaymentProviderType
  ): Promise<PaymentIntentResult> {
    const provider = this.getProvider(preferredProvider);
    return provider.createIntent(input);
  }

  async verifyPayment(
    input: PaymentVerificationInput,
    providerType: PaymentProviderType = 'whatsapp_upi'
  ): Promise<PaymentVerificationResult> {
    const provider = this.getProvider(providerType);
    return provider.verifyPayment(input);
  }

  async refund(
    input: RefundInput,
    providerType: PaymentProviderType = 'whatsapp_upi'
  ): Promise<RefundResult> {
    const provider = this.getProvider(providerType);
    return provider.refund(input);
  }
}

export const paymentService = new PaymentService();
