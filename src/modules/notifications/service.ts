import { EmailProvider, CreateCampaignInput, CampaignResult } from './types';
import { ConsoleEmailProvider } from './providers/console';
import { BrevoEmailProvider } from './providers/brevo';
import { EmailJSEmailProvider } from './providers/emailjs';
import { serverEnv } from '@/config/env.server';

class NotificationService {
  private provider: EmailProvider;

  constructor() {
    if (serverEnv.EMAIL_PROVIDER === 'emailjs') {
      this.provider = new EmailJSEmailProvider();
    } else if (serverEnv.EMAIL_PROVIDER === 'brevo' && serverEnv.BREVO_API_KEY) {
      this.provider = new BrevoEmailProvider();
    } else {
      this.provider = new ConsoleEmailProvider();
    }
  }

  /**
   * Dispatches a 6-digit OTP code for password reset.
   * Supports EmailJS template parameters, Brevo rich HTML, and Console logging.
   */
  async sendPasswordResetOtp(to: string, name: string, otp: string, resetUrl?: string): Promise<string> {
    const subject = `Your MUVERA Password Reset OTP: ${otp}`;
    const text = `Hi ${name},\n\nYour 6-digit password reset verification OTP for MUVERA is:\n\n${otp}\n\nThis OTP is valid for 15 minutes. Do not share this code with anyone.\n\nBest regards,\nMUVERA Security Team`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0E0E10; color: #FFFFFF; border: 1px solid #2E2E38; border-radius: 16px; overflow: hidden; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FACC15; font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 0;">MUVERA</h1>
          <p style="color: #A1A1AA; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Security &amp; Account Protection</p>
        </div>
        
        <div style="background-color: #18181B; border: 1px solid #2E2E38; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; color: #FFFFFF;">Password Reset Verification</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #D1C6AB; text-align: left;">Hi <strong>${name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; text-align: left;">
            We received a request to reset your password. Use the single-use 6-digit verification OTP below to verify your identity.
          </p>
          
          <div style="margin: 28px 0; background-color: #0E0E10; border: 1px solid #FACC15; border-radius: 12px; padding: 18px 24px; display: inline-block;">
            <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #A1A1AA; font-weight: 700;">YOUR 6-DIGIT OTP</p>
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #FACC15;">
              ${otp}
            </span>
            <p style="margin: 6px 0 0 0; font-size: 11px; color: #71717A;">Valid for 15 minutes</p>
          </div>

          ${resetUrl ? `
          <div style="margin: 16px 0;">
            <a href="${resetUrl}" style="background-color: #2E2E38; color: #FACC15; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 12px; text-decoration: none; display: inline-block; border: 1px solid #3F3F46;">
              Or Click Here to Reset Instantly
            </a>
          </div>
          ` : ''}

          <p style="font-size: 12px; line-height: 1.5; color: #71717A; margin-bottom: 0; text-align: left;">
            If you did not request this OTP, please ignore this email or reach out to <a href="mailto:support@muvera.club" style="color: #FACC15;">support@muvera.club</a>.
          </p>
        </div>
      </div>
    `;

    return this.provider.send({
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
   * Creates an email marketing / announcement campaign.
   */
  async createEmailCampaign(input: CreateCampaignInput): Promise<CampaignResult> {
    if (this.provider.createCampaign) {
      return this.provider.createCampaign(input);
    }
    return {
      success: false,
      message: `Current email provider "${this.provider.name}" does not support campaigns. Configure Brevo to send campaigns.`,
    };
  }

  /**
   * Sends a 30-minute single-use password reset link.
   */
  async sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<string> {
    const subject = 'Reset Your MUVERA Account Password';

    const text = `Hi ${name},\n\nWe received a request to reset your password for your MUVERA account.\n\nClick the link below to set a new password (valid for 30 minutes):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email. Your password will not change.\n\nBest regards,\nMUVERA Security Team`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0E0E10; color: #FFFFFF; border: 1px solid #2E2E38; border-radius: 16px; overflow: hidden; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FACC15; font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 0;">MUVERA</h1>
          <p style="color: #A1A1AA; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Security &amp; Account Protection</p>
        </div>
        
        <div style="background-color: #18181B; border: 1px solid #2E2E38; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; color: #FFFFFF;">Password Reset Request</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #D1C6AB;">Hi <strong>${name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA;">
            We received a request to reset the password for your MUVERA account. Click the button below to choose a new password. This link is single-use and will expire in <strong>30 minutes</strong>.
          </p>
          
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background-color: #FACC15; color: #0E0E10; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 14px; text-decoration: none; display: inline-block; box-shadow: 0 4px 14px rgba(250, 204, 21, 0.3);">
              Reset My Password
            </a>
          </div>

          <p style="font-size: 12px; line-height: 1.5; color: #71717A; margin-bottom: 0;">
            Or copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #FACC15; word-break: break-all; font-size: 11px;">${resetUrl}</a>
          </p>
        </div>

        <p style="font-size: 12px; color: #71717A; line-height: 1.5; margin: 0; text-align: center;">
          If you didn't request this reset, you can safely ignore this email. Your account remains completely secure.
        </p>
      </div>
    `;

    return this.provider.send({
      to,
      subject,
      html,
      text,
      tags: ['password_reset'],
    });
  }

  /**
   * Sends confirmation that the password was successfully updated.
   */
  async sendPasswordChangedEmail(to: string, name: string): Promise<string> {
    const subject = 'Your MUVERA Password Was Changed';

    const text = `Hi ${name},\n\nYour MUVERA password was successfully changed. All existing sessions have been signed out.\n\nIf you did not perform this change, please contact support@muvera.club immediately.\n\nBest regards,\nMUVERA Security Team`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0E0E10; color: #FFFFFF; border: 1px solid #2E2E38; border-radius: 16px; overflow: hidden; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FACC15; font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 0;">MUVERA</h1>
          <p style="color: #A1A1AA; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Security &amp; Account Protection</p>
        </div>
        
        <div style="background-color: #18181B; border: 1px solid #2E2E38; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; color: #10B981;">✓ Password Changed Successfully</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #D1C6AB;">Hi <strong>${name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA;">
            Your password was just updated. For your security, all active sessions on other devices have been signed out.
          </p>
          <p style="font-size: 13px; line-height: 1.5; color: #EF4444; margin-bottom: 0;">
            <strong>Wasn't you?</strong> If you did not make this change, please reach out to <a href="mailto:support@muvera.club" style="color: #FACC15;">support@muvera.club</a> immediately to freeze your account.
          </p>
        </div>
      </div>
    `;

    return this.provider.send({
      to,
      subject,
      html,
      text,
      tags: ['password_changed'],
    });
  }
}

export const notificationService = new NotificationService();
