/**
 * Responsive Mobile-First HTML Email Template Builder
 * Compatible with Gmail (iOS/Android), Apple Mail, Outlook Mobile, Samsung Mail.
 */

interface BaseEmailOptions {
  subtitle: string;
  contentHtml: string;
  footerNoticeHtml?: string;
}

export function wrapResponsiveEmail({
  subtitle,
  contentHtml,
  footerNoticeHtml,
}: BaseEmailOptions): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>MUVERA</title>
  <style type="text/css">
    * {
      box-sizing: border-box !important;
      -webkit-box-sizing: border-box !important;
    }
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      border-collapse: collapse !important;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: #060608 !important;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    @media only screen and (max-width: 480px) {
      .email-wrapper {
        padding: 12px 6px !important;
      }
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        padding: 20px 14px !important;
        border-radius: 12px !important;
      }
      .email-card {
        padding: 16px 12px !important;
        border-radius: 10px !important;
      }
      .otp-box {
        padding: 14px 10px !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .otp-code {
        font-size: 26px !important;
        letter-spacing: 5px !important;
        padding-left: 5px !important;
      }
      .email-brand {
        font-size: 24px !important;
        letter-spacing: 3px !important;
      }
      .btn-action {
        width: 100% !important;
        padding: 12px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #060608; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-wrapper" style="width: 100%; background-color: #060608; padding: 28px 12px; margin: 0; border-collapse: collapse;">
    <tr>
      <td align="center" valign="top">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 500px; width: 100%; margin: 0 auto; background-color: #0E0E10; color: #FFFFFF; border: 1px solid #27272A; border-radius: 16px; padding: 28px 22px; box-sizing: border-box; border-collapse: collapse;">
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h1 class="email-brand" style="color: #FACC15; font-size: 28px; font-weight: 900; letter-spacing: 4px; margin: 0; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">MUVERA</h1>
              <p style="color: #A1A1AA; font-size: 11px; margin: 5px 0 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">${subtitle}</p>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-card" style="background-color: #121216; border: 1px solid #27272A; border-radius: 12px; padding: 20px 18px; box-sizing: border-box; width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="left" style="color: #FFFFFF;">
                    ${contentHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${
            footerNoticeHtml
              ? `
          <!-- Footer Notice -->
          <tr>
            <td align="center" style="padding-top: 18px;">
              ${footerNoticeHtml}
            </td>
          </tr>`
              : ''
          }
          <!-- Statutory Footer -->
          <tr>
            <td align="center" style="padding-top: 20px;">
              <p style="font-size: 11px; color: #52525B; margin: 0; letter-spacing: 0.5px;">© 2026 MUVERA Luxury Streetwear • High-Speed Fashion</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Renders a responsive mobile-friendly OTP box.
 */
export function renderOtpBox(label: string, otp: string, expiryText: string): string {
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="otp-box" style="margin: 20px auto; background-color: #0A0A0D; border: 1px solid #FACC15; border-radius: 12px; padding: 16px 14px; width: 100%; max-width: 290px; box-sizing: border-box; text-align: center; border-collapse: collapse;">
      <tr>
        <td align="center">
          <p style="margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #A1A1AA; font-weight: 700;">${label}</p>
          <div class="otp-code" style="font-family: 'Courier New', Courier, monospace, Consolas; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #FACC15; padding-left: 8px; text-align: center; word-break: break-all; line-height: 1.2;">
            ${otp}
          </div>
          <p style="margin: 8px 0 0; font-size: 11px; color: #71717A;">${expiryText}</p>
        </td>
      </tr>
    </table>
  `;
}

/**
 * 1. Cash on Delivery (COD) Verification OTP Email
 */
export function buildCodOtpEmail(name: string, otp: string, orderNo: string): string {
  const contentHtml = `
    <p style="font-size: 15px; line-height: 1.6; color: #FFFFFF; margin: 0 0 14px;">Hi <strong style="color: #FACC15;">${name}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; margin: 0 0 18px;">
      Please enter the single-use 6-digit verification code below to confirm your Cash on Delivery order <strong>#${orderNo}</strong>.
    </p>
    ${renderOtpBox('YOUR 6-DIGIT CODE', otp, 'Expires in 5 minutes')}
    <p style="font-size: 12px; line-height: 1.5; color: #71717A; margin: 18px 0 0;">
      If you did not initiate this order, please disregard this email. Never share this code with anyone.
    </p>
  `;

  return wrapResponsiveEmail({
    subtitle: 'Cash on Delivery Verification',
    contentHtml,
  });
}

/**
 * 2. Signup / Registration Email Verification OTP
 */
export function buildSignupOtpEmail(name: string, otp: string): string {
  const contentHtml = `
    <p style="font-size: 15px; line-height: 1.6; color: #FFFFFF; margin: 0 0 14px;">Hi <strong style="color: #FACC15;">${name}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; margin: 0 0 18px;">
      Welcome to MUVERA. Please enter the single-use 4-digit verification code below to confirm your email address and activate your account.
    </p>
    ${renderOtpBox('YOUR 4-DIGIT CODE', otp, 'Expires in 10 minutes')}
    <p style="font-size: 12px; line-height: 1.5; color: #71717A; margin: 18px 0 0;">
      If you did not initiate this request, you can safely disregard this email. Never share this code with anyone.
    </p>
  `;

  return wrapResponsiveEmail({
    subtitle: 'Security & Member Verification',
    contentHtml,
  });
}

/**
 * 3. Password Reset OTP Email
 */
export function buildPasswordResetOtpEmail(name: string, otp: string, resetUrl?: string): string {
  const contentHtml = `
    <h2 style="font-size: 17px; font-weight: 700; margin: 0 0 14px; color: #FFFFFF; text-align: center;">Password Reset Verification</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #D1C6AB; margin: 0 0 12px;">Hi <strong>${name}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; margin: 0 0 18px;">
      We received a request to reset your password. Use the single-use 6-digit verification OTP below to verify your identity.
    </p>
    ${renderOtpBox('YOUR 6-DIGIT OTP', otp, 'Valid for 15 minutes')}
    ${
      resetUrl
        ? `
      <div style="text-align: center; margin: 16px 0;">
        <a href="${resetUrl}" class="btn-action" style="background-color: #2E2E38; color: #FACC15; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 12px; text-decoration: none; display: inline-block; border: 1px solid #3F3F46; box-sizing: border-box;">
          Or Click Here to Reset Instantly
        </a>
      </div>
    `
        : ''
    }
    <p style="font-size: 12px; line-height: 1.5; color: #71717A; margin: 16px 0 0;">
      If you did not request this OTP, please ignore this email or reach out to <a href="mailto:support@muvera.club" style="color: #FACC15; text-decoration: none;">support@muvera.club</a>.
    </p>
  `;

  return wrapResponsiveEmail({
    subtitle: 'Security & Account Protection',
    contentHtml,
  });
}

/**
 * 4. Password Reset Link Email
 */
export function buildPasswordResetEmail(name: string, resetUrl: string): string {
  const contentHtml = `
    <h2 style="font-size: 17px; font-weight: 700; margin: 0 0 14px; color: #FFFFFF; text-align: center;">Password Reset Request</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #D1C6AB; margin: 0 0 12px;">Hi <strong>${name}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; margin: 0 0 18px;">
      We received a request to reset the password for your MUVERA account. Click the button below to choose a new password. This link is single-use and will expire in <strong>30 minutes</strong>.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" class="btn-action" style="background-color: #FACC15; color: #0E0E10; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 14px; text-decoration: none; display: inline-block; box-shadow: 0 4px 14px rgba(250, 204, 21, 0.3); box-sizing: border-box;">
        Reset My Password
      </a>
    </div>
    <p style="font-size: 12px; line-height: 1.5; color: #71717A; margin: 18px 0 0;">
      Or copy and paste this link into your browser:<br/>
      <a href="${resetUrl}" style="color: #FACC15; word-break: break-all; font-size: 11px; text-decoration: none;">${resetUrl}</a>
    </p>
  `;

  const footerNoticeHtml = `
    <p style="font-size: 12px; color: #71717A; line-height: 1.5; margin: 0; text-align: center;">
      If you didn't request this reset, you can safely ignore this email. Your account remains completely secure.
    </p>
  `;

  return wrapResponsiveEmail({
    subtitle: 'Security & Account Protection',
    contentHtml,
    footerNoticeHtml,
  });
}

/**
 * 5. Password Changed Confirmation Email
 */
export function buildPasswordChangedEmail(name: string): string {
  const contentHtml = `
    <h2 style="font-size: 17px; font-weight: 700; margin: 0 0 14px; color: #10B981; text-align: center;">✓ Password Changed Successfully</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #D1C6AB; margin: 0 0 12px;">Hi <strong>${name}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; margin: 0 0 16px;">
      Your password was just updated. For your security, all active sessions on other devices have been signed out.
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #EF4444; margin: 0;">
      <strong>Wasn't you?</strong> If you did not make this change, please reach out to <a href="mailto:support@muvera.club" style="color: #FACC15; text-decoration: none;">support@muvera.club</a> immediately to freeze your account.
    </p>
  `;

  return wrapResponsiveEmail({
    subtitle: 'Security & Account Protection',
    contentHtml,
  });
}

/**
 * 6. Order Confirmation Email
 */
export function buildOrderConfirmationEmail(order: any): string {
  const name = order.customerName || 'Customer';
  const orderNo = order.orderNo || order.id?.slice(-8) || 'ORDER';
  const amountRupees = ((order.totalPaise || 0) / 100).toFixed(2);
  const paymentMethodLabel =
    order.paymentPreference === 'cod' ? 'Cash on Delivery (Pay upon delivery)' : 'Paid Online (Razorpay)';

  const contentHtml = `
    <p style="font-size: 15px; line-height: 1.6; color: #FFFFFF; margin: 0 0 12px;">Hi <strong style="color: #FACC15;">${name}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; margin: 0 0 18px;">
      Thank you for your order! Your order <strong>#${orderNo}</strong> is confirmed and is being prepped for fulfillment.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0A0A0D; border: 1px solid #27272A; border-radius: 8px; padding: 14px; margin: 16px 0; width: 100%; box-sizing: border-box; border-collapse: collapse;">
      <tr>
        <td>
          <p style="margin: 0 0 6px; font-size: 13px; color: #A1A1AA;">Total Amount: <strong style="color: #FACC15;">₹${amountRupees}</strong></p>
          <p style="margin: 0; font-size: 13px; color: #A1A1AA;">Payment: <strong style="color: #FFFFFF;">${paymentMethodLabel}</strong></p>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; line-height: 1.5; color: #71717A; margin: 16px 0 0;">
      * In accordance with statutory guidelines, your tax invoice and carrier tracking link will be provided upon warehouse dispatch.
    </p>
  `;

  return wrapResponsiveEmail({
    subtitle: 'Order Confirmed',
    contentHtml,
  });
}
