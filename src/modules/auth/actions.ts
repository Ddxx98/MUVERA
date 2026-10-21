'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { authService } from './service';
import { RegisterInput, LoginInput, UserProfile } from './types';
import { handleActionError, ServiceResult } from '@/lib/errors';
import { verifyJwt } from './crypto';

/**
 * Cookie names:
 *  - Admins get a separate cookie (muvera_admin_session) with SameSite=Strict
 *  - Customers get muvera_session with SameSite=Lax (needed for WhatsApp OAuth redirects)
 */
const ADMIN_COOKIE_NAME = 'muvera_admin_session';
const CUSTOMER_COOKIE_NAME = 'muvera_session';

const SESSION_MAX_AGE_SECONDS = 6 * 60 * 60; // 6 hours auto-logout

function setSessionCookie(token: string, role: string) {
  const isAdmin = role === 'admin';
  const cookieName = isAdmin ? ADMIN_COOKIE_NAME : CUSTOMER_COOKIE_NAME;

  cookies().set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: isAdmin ? 'strict' : 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });

  // If previously had the other cookie, clear it (prevent stale cross-role cookies)
  if (isAdmin) {
    cookies().delete(CUSTOMER_COOKIE_NAME);
  } else {
    cookies().delete(ADMIN_COOKIE_NAME);
  }
}

function clearAllSessionCookies() {
  cookies().delete(CUSTOMER_COOKIE_NAME);
  cookies().delete(ADMIN_COOKIE_NAME);
}

/**
 * Reads the session token from cookies, checking admin cookie first, then customer.
 */
function getSessionToken(): string | undefined {
  return (
    cookies().get(ADMIN_COOKIE_NAME)?.value ||
    cookies().get(CUSTOMER_COOKIE_NAME)?.value
  );
}

/**
 * Server Action: Registers a new user and sets session cookie.
 */
export async function registerAction(input: RegisterInput): Promise<ServiceResult<UserProfile>> {
  try {
    const { user, token } = await authService.registerUser(input);
    setSessionCookie(token, user.role);
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
    setSessionCookie(token, user.role);
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
    setSessionCookie(token, user.role);
    revalidatePath('/account');
    revalidatePath('/admin');
    return { ok: true, data: user };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Clears all session cookies on logout.
 */
export async function logoutAction(): Promise<ServiceResult<{ success: boolean }>> {
  try {
    clearAllSessionCookies();
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
    const sessionToken = getSessionToken();
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
    clearAllSessionCookies();
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
    clearAllSessionCookies();
    const res = await authService.resetPasswordWithOtp(email, otp, newPassword);
    revalidatePath('/account');
    return { ok: true, data: res };
  } catch (err) {
    return handleActionError(err);
  }
}
