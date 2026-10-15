'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { authService } from './service';
import { RegisterInput, LoginInput, UserProfile } from './types';
import { handleActionError, ServiceResult } from '@/lib/errors';

const SESSION_COOKIE_NAME = 'muvera_session';
const SESSION_MAX_AGE_SECONDS = 6 * 60 * 60; // 6 hours auto-logout

function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE_NAME);
}

/**
 * Server Action: Registers a new user and sets session cookie.
 */
export async function registerAction(input: RegisterInput): Promise<ServiceResult<UserProfile>> {
  try {
    const { user, token } = await authService.registerUser(input);
    setSessionCookie(token);
    revalidatePath('/account');
    return { ok: true, data: user };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Logs in a user with email and password and sets session cookie.
 */
export async function loginAction(input: LoginInput): Promise<ServiceResult<UserProfile>> {
  try {
    const { user, token } = await authService.loginWithCredentials(input);
    setSessionCookie(token);
    revalidatePath('/account');
    revalidatePath('/admin');
    return { ok: true, data: user };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Logs in a user via WhatsApp Mobile OTP.
 */
export async function loginWithOtpAction(phone: string, otp: string): Promise<ServiceResult<UserProfile>> {
  try {
    const { user, token } = await authService.loginWithOtp(phone, otp);
    setSessionCookie(token);
    revalidatePath('/account');
    revalidatePath('/admin');
    return { ok: true, data: user };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Clears session cookie on logout.
 */
export async function logoutAction(): Promise<ServiceResult<{ success: boolean }>> {
  try {
    clearSessionCookie();
    revalidatePath('/');
    revalidatePath('/account');
    revalidatePath('/admin');
    return { ok: true, data: { success: true } };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Fetches the currently authenticated user from session cookie.
 */
export async function getCurrentUserAction(): Promise<UserProfile | null> {
  try {
    const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) return null;
    return await authService.getSessionUser(sessionToken);
  } catch {
    return null;
  }
}

/**
 * Server Action: Triggers password reset request email with enumeration protection.
 */
export async function requestPasswordResetAction(email: string): Promise<ServiceResult<{ message: string }>> {
  try {
    const headerList = headers();
    const clientIp = headerList.get('x-forwarded-for')?.split(',')[0].trim() || headerList.get('x-real-ip') || undefined;
    const userAgent = headerList.get('user-agent') || undefined;
    const host = headerList.get('host');
    const proto = headerList.get('x-forwarded-proto') || 'http';
    const originUrl = host ? `${proto}://${host}` : undefined;

    const res = await authService.requestPasswordReset(email, clientIp, userAgent, originUrl);
    return { ok: true, data: res };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Validates token validity before displaying reset password UI.
 */
export async function validateResetTokenAction(token: string): Promise<ServiceResult<{ valid: boolean; email?: string; message?: string }>> {
  try {
    const res = await authService.validateResetToken(token);
    return { ok: true, data: res };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Sets a new password, invalidates tokens, and signs out previous sessions.
 */
export async function resetPasswordAction(token: string, newPassword: string): Promise<ServiceResult<{ message: string }>> {
  try {
    clearSessionCookie();
    const res = await authService.resetPassword(token, newPassword);
    revalidatePath('/account');
    return { ok: true, data: res };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Validates 6-digit OTP, updates password, and clears old sessions.
 */
export async function resetPasswordWithOtpAction(
  email: string,
  otp: string,
  newPassword: string
): Promise<ServiceResult<{ message: string }>> {
  try {
    clearSessionCookie();
    const res = await authService.resetPasswordWithOtp(email, otp, newPassword);
    revalidatePath('/account');
    return { ok: true, data: res };
  } catch (err) {
    return handleActionError(err);
  }
}


