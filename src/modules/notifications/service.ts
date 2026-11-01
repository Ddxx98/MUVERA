import { EmailProvider, CreateCampaignInput, CampaignResult } from './types';
import { ConsoleEmailProvider } from './providers/console';
import { BrevoEmailProvider } from './providers/brevo';
import { EmailJSEmailProvider } from './providers/emailjs';
import { serverEnv } from '@/config/env.server';
import {
  buildSignupOtpEmail,
  buildPasswordResetOtpEmail,
  buildPasswordResetEmail,
  buildPasswordChangedEmail,
  buildCodOtpEmail,
  buildOrderConfirmationEmail,
} from './email-template';

class NotificationService {
  private defaultProvider: EmailProvider;
  private brevoProvider: BrevoEmailProvider;
  private emailjsProvider: EmailJSEmailProvider;
  private consoleProvider: ConsoleEmailProvider;

  constructor() {
    this.consoleProvider = new ConsoleEmailProvider();
    this.brevoProvider = new BrevoEmailProvider();
    this.emailjsProvider = new EmailJSEmailProvider();

    // Set fallback default provider based on environment setting
    if (serverEnv.EMAIL_PROVIDER === 'emailjs') {
      this.defaultProvider = this.emailjsProvider;
    } else if (serverEnv.EMAIL_PROVIDER === 'brevo' && serverEnv.BREVO_API_KEY) {
      this.defaultProvider = this.brevoProvider;
    } else {
      this.defaultProvider = this.consoleProvider;
    }
  }

  /**
   * Dispatches a 4-digit OTP code for account creation email verification.
   * Prefers EmailJS using template_4ck851n, falling back to Brevo or Console.
   */
  async sendSignupOtp(to: string, name: string, otp: string): Promise<string> {
    const subject = `${otp} is your MUVERA verification code`;
    const text = `Hi ${name},\n\nWelcome to MUVERA. Your 4-digit verification code is:\n\n${otp}\n\nThis code is valid for 10 minutes. Please enter it to verify your email address and activate your account.\n\nBest regards,\nMUVERA Team`;
    const html = buildSignupOtpEmail(name, otp);

    // Route: If EmailJS template/service configured, dispatch via EmailJS
    const provider = (serverEnv.EMAILJS_TEMPLATE_ID && (serverEnv.EMAILJS_SERVICE_ID || serverEnv.EMAIL_PROVIDER === 'emailjs'))
      ? this.emailjsProvider
      : (serverEnv.BREVO_API_KEY ? this.brevoProvider : this.defaultProvider);

    return provider.send({
      to,
      name,
      subject,
      html,
      text,
      otp,
      tags: ['signup_otp_verification'],
      templateParams: {
        otp,
        otp_code: otp,
        passcode: otp,
        to_name: name,
        to_email: to,
        email: to,
        expiry_minutes: '10',
        subject,
      },
    });
  }

  /**
   * Dispatches a 6-digit OTP code for password reset.
   * Prefers Brevo rich HTML with fallback to EmailJS or Console.
   */
  async sendPasswordResetOtp(to: string, name: string, otp: string, resetUrl?: string): Promise<string> {
    const subject = `${otp} is your MUVERA password reset code`;
    const text = `Hi ${name},\n\nYour 6-digit password reset verification OTP for MUVERA is:\n\n${otp}\n\nThis OTP is valid for 15 minutes. Do not share this code with anyone.\n\nBest regards,\nMUVERA Security Team`;
    const html = buildPasswordResetOtpEmail(name, otp, resetUrl);

    // Route: Prefer Brevo for Password Reset
    const provider = serverEnv.BREVO_API_KEY ? this.brevoProvider : this.defaultProvider;

    return provider.send({
      to,
      name,
      subject,
      html,
      text,
      otp,
      tags: ['password_reset_otp'],
      templateParams: {
        otp,
        otp_code: otp,
        passcode: otp,
        to_name: name,
        expiry_minutes: '15',
        reset_url: resetUrl || '',
      },
    });
  }

  /**
   * Creates an email marketing / announcement campaign via Brevo.
   */
  async createEmailCampaign(input: CreateCampaignInput): Promise<CampaignResult> {
    if (this.brevoProvider.createCampaign) {
      return this.brevoProvider.createCampaign(input);
    }
    return {
      success: false,
      message: 'Brevo configuration is required to create email campaigns.',
    };
  }

  /**
   * Sends a 30-minute single-use password reset link via Brevo.
   */
  async sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<string> {
    const subject = 'Reset Your MUVERA Account Password';
    const text = `Hi ${name},\n\nWe received a request to reset your password for your MUVERA account.\n\nClick the link below to set a new password (valid for 30 minutes):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email. Your password will not change.\n\nBest regards,\nMUVERA Security Team`;
    const html = buildPasswordResetEmail(name, resetUrl);

    const provider = serverEnv.BREVO_API_KEY ? this.brevoProvider : this.defaultProvider;

    return provider.send({
      to,
      subject,
      html,
      text,
      tags: ['password_reset'],
    });
  }

  /**
   * Sends confirmation that the password was successfully updated via Brevo.
   */
  async sendPasswordChangedEmail(to: string, name: string): Promise<string> {
    const subject = 'Your MUVERA Password Was Changed';
    const text = `Hi ${name},\n\nYour MUVERA password was successfully changed. All existing sessions have been signed out.\n\nIf you did not perform this change, please contact support@muvera.club immediately.\n\nBest regards,\nMUVERA Security Team`;
    const html = buildPasswordChangedEmail(name);

    const provider = serverEnv.BREVO_API_KEY ? this.brevoProvider : this.defaultProvider;

    return provider.send({
      to,
      subject,
      html,
      text,
      tags: ['password_changed'],
    });
  }

  /**
   * Dispatches a 6-digit OTP code to verify a Cash on Delivery (COD) order.
   */
  async sendCodOtp(to: string, name: string, otp: string, orderNo: string): Promise<string> {
    const subject = `${otp} is your MUVERA COD code (#${orderNo})`;
    const text = `Hi ${name},\n\nYour 6-digit verification code to confirm your Cash on Delivery order #${orderNo} is:\n\n${otp}\n\nThis code expires in 5 minutes. Please enter it on checkout to confirm your parcel.\n\nBest regards,\nMUVERA Team`;
    const html = buildCodOtpEmail(name, otp, orderNo);

    const provider = serverEnv.BREVO_API_KEY ? this.brevoProvider : this.defaultProvider;

    return provider.send({
      to,
      name,
      subject,
      html,
      text,
      otp,
      tags: ['cod_verification_otp'],
      templateParams: {
        otp,
        otp_code: otp,
        passcode: otp,
        to_name: name,
        expiry_minutes: '5',
        order_no: orderNo,
        subject,
      },
    });
  }

  /**
   * Sends booking confirmation email for a confirmed order (COD or Prepaid).
   */
  async sendOrderConfirmationEmail(order: any): Promise<string> {
    const to = order.customerEmail || order.shippingAddress?.email;
    if (!to) return '';
    const name = order.customerName || 'Customer';
    const orderNo = order.orderNo || order.id?.slice(-8) || 'ORDER';
    const amountRupees = ((order.totalPaise || 0) / 100).toFixed(2);
    const subject = `Order Confirmed: #${orderNo} - MUVERA`;
    const text = `Hi ${name},\n\nYour order #${orderNo} has been confirmed!\nTotal Amount: ₹${amountRupees}\nPayment Method: ${order.paymentPreference === 'cod' ? 'Cash on Delivery' : 'Prepaid (Online)'}\n\nWe are preparing your package. A statutory tax invoice and tracking details will be generated upon dispatch.\n\nThank you for shopping with MUVERA.`;
    const html = buildOrderConfirmationEmail(order);

    const provider = serverEnv.BREVO_API_KEY ? this.brevoProvider : this.defaultProvider;

    return provider.send({
      to,
      name,
      subject,
      html,
      text,
      tags: ['order_confirmed'],
    });
  }
}

export const notificationService = new NotificationService();
