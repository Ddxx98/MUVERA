import crypto from 'crypto';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, signJwt, verifyJwt, signSessionToken, verifySessionToken } from './crypto';
import { newToken, hashToken } from './tokens';
import { RegisterInput, LoginInput, UserProfile, UserRecord, AuthSession, UserRole } from './types';
import { AppError } from '@/lib/errors';
import { auditService } from '@/modules/audit';
import { notificationService } from '@/modules/notifications';
import { serverEnv } from '@/config/env.server';

/**
 * Normalizes user role: 'admin' (case-insensitive) grants admin privileges;
 * everything else ('user', 'customer', 'normal', undefined, etc.) defaults to 'customer'.
 */
export function normalizeUserRole(role?: string): UserRole {
  return role && role.trim().toLowerCase() === 'admin' ? 'admin' : 'customer';
}

export const SESSION_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours auto-logout

export const authService = {
  /**
   * Registers a new customer user and dispatches a 4-digit verification OTP.
   */
  async registerUser(input: RegisterInput): Promise<{ user: UserProfile; requiresVerification: boolean; email: string }> {
    const cleanEmail = input.email.toLowerCase().trim();
    const cleanPhone = input.phone.replace(/\D/g, '');

    if (!input.name || input.name.trim().length < 2) {
      throw new AppError('INVALID_NAME', 'Please provide a valid full name.');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new AppError('INVALID_EMAIL', 'Please provide a valid email address.');
    }
    if (cleanPhone.length < 10) {
      throw new AppError('INVALID_PHONE', 'Please provide a valid 10-digit mobile number.');
    }
    if (!input.password || input.password.length < 6) {
      throw new AppError('INVALID_PASSWORD', 'Password must be at least 6 characters long.');
    }

    // Check duplicate email
    const existingEmail = await db.getUserByEmail(cleanEmail);
    if (existingEmail) {
      if (existingEmail.emailVerified) {
        throw new AppError('EMAIL_EXISTS', 'An account with this email address already exists. Please log in.');
      }
      // If unverified, update credentials and resend 4-digit OTP
      const passwordHash = hashPassword(input.password);
      await db.updateUserPassword(existingEmail.id, passwordHash);
      await db.invalidateUserTokens(existingEmail.id, 'email_verify');

      const otp = crypto.randomInt(1000, 10000).toString();
      const otpHash = hashToken(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.createAuthToken({
        userId: existingEmail.id,
        email: cleanEmail,
        type: 'email_verify',
        tokenHash: otpHash,
        expiresAt,
      });

      try {
        await notificationService.sendSignupOtp(cleanEmail, existingEmail.name, otp);
      } catch (notifErr) {
        console.error('[AUTH] Failed to send signup verification OTP:', notifErr);
      }

      const role = normalizeUserRole(existingEmail.role);
      const profile: UserProfile = {
        id: existingEmail.id,
        name: existingEmail.name,
        email: existingEmail.email,
        phone: existingEmail.phone,
        role,
        addresses: existingEmail.addresses,
        loyaltyTier: existingEmail.loyaltyTier,
        emailVerified: false,
        createdAt: existingEmail.createdAt,
      };

      return { user: profile, requiresVerification: true, email: cleanEmail };
    }

    // Check duplicate phone
    const existingPhone = await db.getUserByPhone(cleanPhone);
    if (existingPhone) {
      if (existingPhone.emailVerified) {
        throw new AppError('PHONE_EXISTS', 'An account with this mobile number already exists.');
      }
    }

    const passwordHash = hashPassword(input.password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const role = normalizeUserRole(input.role);

    const newUser: UserRecord = {
      id: userId,
      name: input.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      role,
      addresses: [],
      loyaltyTier: 'Club Member',
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };

    const saved = await db.saveUser(newUser);
    const savedRole = normalizeUserRole(saved.role);

    await db.invalidateUserTokens(saved.id, 'email_verify');

    // Generate 4-digit OTP
    const otp = crypto.randomInt(1000, 10000).toString();
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.createAuthToken({
      userId: saved.id,
      email: cleanEmail,
      type: 'email_verify',
      tokenHash: otpHash,
      expiresAt,
    });

    try {
      await notificationService.sendSignupOtp(cleanEmail, saved.name, otp);
    } catch (notifErr) {
      console.error('[AUTH] Failed to dispatch signup OTP:', notifErr);
    }

    await auditService.recordAudit({
      action: 'USER_REGISTER_INITIATED',
      entity: 'customer' as any,
      entityId: saved.id,
      actor: saved.email,
      after: { email: saved.email, role: savedRole },
    });

    const profile: UserProfile = {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      role: savedRole,
      addresses: saved.addresses,
      loyaltyTier: saved.loyaltyTier,
      emailVerified: false,
      createdAt: saved.createdAt,
    };

    return { user: profile, requiresVerification: true, email: cleanEmail };
  },

  /**
   * Verifies a 4-digit OTP for signup email verification.
   * On success, marks emailVerified = true and returns user & session token.
   */
  async verifySignupOtp(email: string, otp: string): Promise<{ user: UserProfile; token: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.trim().replace(/\D/g, '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new AppError('INVALID_EMAIL', 'Please provide a valid email address.');
    }
    if (cleanOtp.length !== 4) {
      throw new AppError('INVALID_OTP', 'Please enter a valid 4-digit verification code.');
    }

    const otpHash = hashToken(cleanOtp);
    const consumedToken = await db.consumeAuthToken(otpHash, 'email_verify');

    if (!consumedToken || consumedToken.email.toLowerCase() !== cleanEmail) {
      throw new AppError('INVALID_OTP', 'The verification code is invalid or has expired.');
    }

    // Mark user verified
    await db.setUserEmailVerified(consumedToken.userId, true);
    await db.invalidateUserTokens(consumedToken.userId, 'email_verify');

    const user = (await db.getUserById(consumedToken.userId)) || (await db.getUserByEmail(consumedToken.email));
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User record not found.');
    }

    const role = normalizeUserRole(user.role);
    const token = signJwt(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role,
        aud: role === 'admin' ? 'admin' : 'customer',
      },
      SESSION_DURATION_MS / 1000
    );

    await auditService.recordAudit({
      action: 'USER_EMAIL_VERIFIED',
      entity: 'customer' as any,
      entityId: user.id,
      actor: user.email,
    });

    const profile: UserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role,
      addresses: user.addresses,
      loyaltyTier: user.loyaltyTier,
      emailVerified: true,
      createdAt: user.createdAt,
    };

    return { user: profile, token };
  },

  /**
   * Resends a 4-digit OTP for signup email verification.
   */
  async resendSignupOtp(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new AppError('INVALID_EMAIL', 'Please provide a valid email address.');
    }

    const user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'No account found with this email.');
    }

    if (user.emailVerified) {
      throw new AppError('ALREADY_VERIFIED', 'This account is already verified. Please log in.');
    }

    await db.invalidateUserTokens(user.id, 'email_verify');

    const otp = crypto.randomInt(1000, 10000).toString();
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.createAuthToken({
      userId: user.id,
      email: cleanEmail,
      type: 'email_verify',
      tokenHash: otpHash,
      expiresAt,
    });

    try {
      await notificationService.sendSignupOtp(cleanEmail, user.name, otp);
    } catch (notifErr) {
      console.error('[AUTH] Failed to resend signup OTP:', notifErr);
    }

    return { success: true, message: 'A new 4-digit verification code has been sent to your email.' };
  },

  /**
   * Logs in a user with email and password.
   */
  async loginWithCredentials(input: LoginInput): Promise<{ user: UserProfile; token: string }> {
    const rawEmail = input.email || (input as any).emailOrPhone || '';
    const cleanEmail = rawEmail.toLowerCase().trim();
    const user = await db.getUserByEmail(cleanEmail);

    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const isValid = verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const role = normalizeUserRole(user.role);

    // Enforce email verification for customers
    if (role !== 'admin' && user.emailVerified === false) {
      await db.invalidateUserTokens(user.id, 'email_verify');
      const otp = crypto.randomInt(1000, 10000).toString();
      const otpHash = hashToken(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.createAuthToken({
        userId: user.id,
        email: cleanEmail,
        type: 'email_verify',
        tokenHash: otpHash,
        expiresAt,
      });

      try {
        await notificationService.sendSignupOtp(cleanEmail, user.name, otp);
      } catch (err) {
        console.error('[AUTH] Failed to send verification OTP on unverified login attempt:', err);
      }

      throw new AppError(
        'EMAIL_NOT_VERIFIED',
        'Your email address is not verified. A 4-digit verification code has been sent to your email.'
      );
    }

    const token = signJwt(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role,
        aud: role === 'admin' ? 'admin' : 'customer',
      },
      SESSION_DURATION_MS / 1000
    );

    const profile: UserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role,
      addresses: user.addresses,
      loyaltyTier: user.loyaltyTier,
      createdAt: user.createdAt,
    };

    return { user: profile, token };
  },

  /**
   * Logs in or creates a customer via WhatsApp Mobile OTP.
   */
  async loginWithOtp(phone: string, otp: string): Promise<{ user: UserProfile; token: string }> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new AppError('INVALID_PHONE', 'Please provide a valid 10-digit mobile number.');
    }

    if (!otp || otp.length < 4) {
      throw new AppError('INVALID_OTP', 'Please enter a valid 4-digit verification code.');
    }

    // In demo / MVP mode, any 4-digit code is verified
    let user = await db.getUserByPhone(cleanPhone);

    if (!user) {
      // Auto-register customer on first OTP login
      const userId = `user_otp_${Date.now()}`;
      user = {
        id: userId,
        name: `Customer (${cleanPhone.slice(-4)})`,
        email: `user_${cleanPhone.slice(-4)}@muvera.club`,
        phone: cleanPhone,
        passwordHash: hashPassword(`MuveraOtp_${Date.now()}`),
        role: 'customer',
        addresses: [],
        loyaltyTier: 'Club Member',
        createdAt: new Date().toISOString(),
      };
      await db.saveUser(user);
    }

    const role = normalizeUserRole(user.role);

    const token = signJwt(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role,
        aud: role === 'admin' ? 'admin' : 'customer',
      },
      SESSION_DURATION_MS / 1000
    );

    const profile: UserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role,
      addresses: user.addresses,
      loyaltyTier: user.loyaltyTier,
      createdAt: user.createdAt,
    };

    return { user: profile, token };
  },

  /**
   * Decodes session token and fetches fresh profile from database.
   * Supports both legacy HMAC tokens and new JWT format.
   */
  async getSessionUser(token?: string): Promise<UserProfile | null> {
    if (!token) return null;

    let userId: string | undefined;

    // Try new JWT format first (aud=admin or aud=customer)
    const adminPayload = verifyJwt(token, 'admin');
    if (adminPayload) {
      userId = adminPayload.sub;
    } else {
      const customerPayload = verifyJwt(token, 'customer');
      if (customerPayload) {
        userId = customerPayload.sub;
      } else {
        // Fall back to legacy HMAC token for backward compatibility
        const session = verifySessionToken<{ userId?: string; expiresAt?: number }>(token);
        if (!session || !session.userId) return null;
        if (session.expiresAt && Date.now() > session.expiresAt) return null;
        userId = session.userId;
      }
    }

    if (!userId) return null;

    const user = await db.getUserById(userId);
    if (!user) return null;

    const role = normalizeUserRole(user.role);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role,
      addresses: user.addresses,
      loyaltyTier: user.loyaltyTier,
      createdAt: user.createdAt,
    };
  },


  /**
   * Initiates password reset flow by issuing a 256-bit token with SHA-256 storage (Section 23).
   * Prevents account enumeration by always returning the same response regardless of whether
   * the email exists.
   */
  async requestPasswordReset(
    email: string,
    clientIp?: string,
    userAgent?: string,
    originUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const genericResponse = {
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions shortly.',
    };

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return genericResponse;
    }

    const user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      return genericResponse;
    }

    // Invalidate previous reset tokens for this user
    await db.invalidateUserTokens(user.id, 'password_reset');

    // 1. Generate 6-digit numerical OTP (valid 15 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashToken(otp);
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.createAuthToken({
      userId: user.id,
      email: user.email,
      type: 'password_reset',
      tokenHash: otpHash,
      expiresAt: otpExpiresAt,
      requestIp: clientIp,
      userAgent,
    });

    // 2. Also generate 256-bit CSPRNG token for 1-click fallback link (valid 30 minutes)
    const rawToken = newToken();
    const tokenHash = hashToken(rawToken);
    const linkExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.createAuthToken({
      userId: user.id,
      email: user.email,
      type: 'password_reset',
      tokenHash,
      expiresAt: linkExpiresAt,
      requestIp: clientIp,
      userAgent,
    });

    const baseUrl = originUrl || serverEnv.SITE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

    try {
      await notificationService.sendPasswordResetOtp(user.email, user.name, otp, resetUrl);
    } catch (err) {
      console.error('[AUTH] Failed sending password reset OTP:', err);
    }

    await auditService.recordAudit({
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'customer',
      entityId: user.id,
      actor: user.email,
      metadata: { requestIp: clientIp, expiresAt: otpExpiresAt.toISOString() },
    });

    return genericResponse;
  },

  /**
   * Validates a password reset token before displaying the reset form.
   */
  async validateResetToken(rawToken: string): Promise<{ valid: boolean; email?: string; message?: string }> {
    if (!rawToken || rawToken.trim().length === 0) {
      return { valid: false, message: 'Invalid or missing reset token.' };
    }

    const tokenHash = hashToken(rawToken.trim());
    const tokenDoc = await db.findValidAuthToken(tokenHash, 'password_reset');

    if (!tokenDoc) {
      return { valid: false, message: 'This reset link has expired or has already been used.' };
    }

    return { valid: true, email: tokenDoc.email };
  },

  /**
   * Atomically consumes the token and updates the user's password.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!rawToken || rawToken.trim().length === 0) {
      throw new AppError('INVALID_TOKEN', 'Invalid or missing reset token.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new AppError('INVALID_PASSWORD', 'Password must be at least 6 characters long.');
    }

    const tokenHash = hashToken(rawToken.trim());
    const consumedToken = await db.consumeAuthToken(tokenHash, 'password_reset');

    if (!consumedToken) {
      throw new AppError('TOKEN_EXPIRED', 'This reset link is invalid, has expired, or was already used.');
    }

    const newPasswordHash = hashPassword(newPassword);
    await db.updateUserPassword(consumedToken.userId, newPasswordHash);

    // Invalidate any remaining tokens for this user
    await db.invalidateUserTokens(consumedToken.userId, 'password_reset');

    // Send confirmation email
    const user = (await db.getUserById(consumedToken.userId)) || (await db.getUserByEmail(consumedToken.email));
    if (user) {
      try {
        await notificationService.sendPasswordChangedEmail(user.email, user.name);
      } catch (err) {
        console.error('[AUTH] Failed sending password change confirmation email:', err);
      }
    }

    await auditService.recordAudit({
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'customer',
      entityId: consumedToken.userId,
      actor: consumedToken.email,
    });

    return {
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new password.',
    };
  },

  /**
   * Validates a 6-digit numerical OTP and resets the user's password.
   */
  async resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.trim().replace(/\D/g, '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new AppError('INVALID_EMAIL', 'Please provide a valid email address.');
    }

    if (cleanOtp.length !== 6) {
      throw new AppError('INVALID_OTP', 'Please enter a valid 6-digit verification code.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new AppError('INVALID_PASSWORD', 'Password must be at least 6 characters long.');
    }

    const otpHash = hashToken(cleanOtp);
    const consumedToken = await db.consumeAuthToken(otpHash, 'password_reset');

    if (!consumedToken || consumedToken.email.toLowerCase() !== cleanEmail) {
      throw new AppError('INVALID_OTP', 'The 6-digit verification code is incorrect or has expired.');
    }

    const newPasswordHash = hashPassword(newPassword);
    await db.updateUserPassword(consumedToken.userId, newPasswordHash);

    // Invalidate any remaining tokens for this user
    await db.invalidateUserTokens(consumedToken.userId, 'password_reset');

    // Send confirmation email
    const user = (await db.getUserById(consumedToken.userId)) || (await db.getUserByEmail(consumedToken.email));
    if (user) {
      try {
        await notificationService.sendPasswordChangedEmail(user.email, user.name);
      } catch (err) {
        console.error('[AUTH] Failed sending password change confirmation email:', err);
      }
    }

    await auditService.recordAudit({
      action: 'PASSWORD_RESET_COMPLETED_VIA_OTP',
      entity: 'customer',
      entityId: consumedToken.userId,
      actor: consumedToken.email,
    });

    return {
      success: true,
      message: 'Your password has been reset successfully via OTP. Please log in with your new password.',
    };
  },
};

