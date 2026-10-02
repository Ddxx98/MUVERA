import { EmailProvider, SendEmailInput } from '../types';
import { serverEnv } from '@/config/env.server';

export class EmailJSEmailProvider implements EmailProvider {
  readonly name = 'emailjs';

  async send(input: SendEmailInput): Promise<string> {
    const serviceId = serverEnv.EMAILJS_SERVICE_ID;
    const templateId = serverEnv.EMAILJS_TEMPLATE_ID;
    const publicKey = serverEnv.EMAILJS_PUBLIC_KEY;
    const privateKey = serverEnv.EMAILJS_PRIVATE_KEY;

    // Check configuration
    if (!serviceId || !templateId || !publicKey) {
      console.warn('[EMAILJS] Missing EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, or EMAILJS_PUBLIC_KEY.');
      if (serverEnv.NODE_ENV !== 'production') {
        console.log(`[EMAILJS MOCK OTP] Sent to: ${input.to} | OTP: ${input.otp || 'N/A'} | Subject: ${input.subject}`);
        return `emailjs_mock_${Date.now()}`;
      }
      throw new Error('EmailJS credentials are not configured in environment variables.');
    }

    // Prepare template params with all common variations used in EmailJS templates
    const templateParams = {
      to_email: input.to,
      email: input.to,
      to_name: input.name || 'Valued Member',
      name: input.name || 'Valued Member',
      subject: input.subject,
      otp: input.otp || '',
      otp_code: input.otp || '',
      passcode: input.otp || '',
      expiry_minutes: '15',
      message: input.text || `Your MUVERA verification OTP is ${input.otp}`,
      html_content: input.html,
      ...(input.templateParams || {}),
    };

    const payload: any = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: templateParams,
    };

    if (privateKey) {
      payload.accessToken = privateKey;
    }

    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();

      if (!res.ok) {
        console.error(`[EMAILJS API ERROR ${res.status}]:`, responseText);
        if (serverEnv.NODE_ENV !== 'production') {
          console.warn(`[EMAILJS DEV FALLBACK] OTP was ${input.otp}. Proceeding gracefully in development.`);
          return `emailjs_dev_fallback_${Date.now()}`;
        }
        throw new Error(`EmailJS API request failed (${res.status}): ${responseText}`);
      }

      console.log(`[EMAILJS] Successfully dispatched email to ${input.to}`);
      return `emailjs_${Date.now()}`;
    } catch (err: any) {
      if (serverEnv.NODE_ENV !== 'production') {
        console.warn(`[EMAILJS NETWORK FALLBACK] ${err.message}. OTP was: ${input.otp}`);
        return `emailjs_dev_fallback_${Date.now()}`;
      }
      throw err;
    }
  }
}
