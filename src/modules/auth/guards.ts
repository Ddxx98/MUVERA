/**
 * MUVERA — Layer 2 Authoritative Auth Guards
 *
 * Called INSIDE every Route Handler, Server Action, and data function
 * that needs to verify the caller's identity and permissions.
 *
 * Layer 1 (middleware) already verified the JWT signature at the edge.
 * Layer 2 is the authoritative check: it loads the fresh user profile
 * from the database (via the auth service) and enforces:
 *  - Session validity (not expired or revoked)
 *  - Role-Based Access Control (RBAC)
 *  - Resource Ownership (a customer can only read their own data)
 *
 * Usage in Server Actions and Route Handlers:
 *
 *   // Require admin role:
 *   const admin = await requireAdmin();
 *
 *   // Require customer role:
 *   const customer = await requireCustomer();
 *
 *   // Assert resource ownership:
 *   const ctx = await requireCustomer();
 *   ctx.assertOwner(order.customerEmail);
 */

import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppError } from '@/lib/errors';
import { authService } from './service';
import type { UserProfile } from './types';

// ─── Cookie names (must match actions.ts) ─────────────────────────────────────
const ADMIN_COOKIE = 'muvera_admin_session';
const CUSTOMER_COOKIE = 'muvera_session';

// ─── Auth context types ────────────────────────────────────────────────────────

export interface AdminContext {
  user: UserProfile;
}

export interface CustomerContext {
  user: UserProfile;
  /**
   * Asserts that the requesting customer is the owner of the given resource.
   * Throws 403 if not.
   *
   * @param ownerEmail - The resource owner's email address.
   */
  assertOwner(ownerEmail: string): void;
  /**
   * Asserts that the requesting customer's phone matches the resource's owner phone.
   * Throws 403 if not.
   */
  assertOwnerByPhone(ownerPhone: string): void;
}

// ─── requireAdmin ──────────────────────────────────────────────────────────────

/**
 * Layer 2 admin guard.
 *
 * Reads the admin session cookie, loads the user profile, and verifies role=admin.
 *
 * Throws AppError(UNAUTHORIZED, 401) for unauthenticated requests.
 * Throws AppError(FORBIDDEN, 403) for authenticated non-admin requests.
 *
 * This function is SAFE to call from Server Actions and Route Handlers.
 * For page-level access, the admin layout already redirects before rendering.
 */
export async function requireAdmin(): Promise<AdminContext> {
  // Prefer the dedicated admin cookie; fall back to customer cookie for
  // checking role (e.g. an admin who cleared their admin cookie but still
  // has a customer cookie is NOT granted admin access).
  const token =
    cookies().get(ADMIN_COOKIE)?.value ||
    cookies().get(CUSTOMER_COOKIE)?.value;

  if (!token) {
    throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
  }

  const user = await authService.getSessionUser(token);

  if (!user) {
    throw new AppError('UNAUTHORIZED', 'Session expired or invalid. Please log in again.', 401);
  }

  if (user.role !== 'admin') {
    throw new AppError(
      'FORBIDDEN',
      'You do not have permission to perform this action. Admin privileges are required.',
      403
    );
  }

  return { user };
}

// ─── requireCustomer ──────────────────────────────────────────────────────────

/**
 * Layer 2 customer guard.
 *
 * Reads the customer session cookie, loads the user profile.
 * Admins are also allowed through (they can perform customer actions).
 *
 * Throws AppError(UNAUTHORIZED, 401) for unauthenticated requests.
 */
export async function requireCustomer(): Promise<CustomerContext> {
  // Admins can also access customer routes; check both cookies
  const token =
    cookies().get(ADMIN_COOKIE)?.value ||
    cookies().get(CUSTOMER_COOKIE)?.value;

  if (!token) {
    throw new AppError('UNAUTHORIZED', 'Please log in to continue.', 401);
  }

  const user = await authService.getSessionUser(token);

  if (!user) {
    throw new AppError('UNAUTHORIZED', 'Session expired or invalid. Please log in again.', 401);
  }

  return {
    user,
    assertOwner(ownerEmail: string): void {
      // Admins bypass ownership checks
      if (user.role === 'admin') return;
      if (!ownerEmail || user.email.toLowerCase() !== ownerEmail.toLowerCase()) {
        throw new AppError(
          'FORBIDDEN',
          'You do not have permission to access this resource.',
          403
        );
      }
    },
    assertOwnerByPhone(ownerPhone: string): void {
      if (user.role === 'admin') return;
      const normalizedOwner = ownerPhone.replace(/\D/g, '').slice(-10);
      const normalizedUser = (user.phone || '').replace(/\D/g, '').slice(-10);
      if (!normalizedOwner || normalizedUser !== normalizedOwner) {
        throw new AppError(
          'FORBIDDEN',
          'You do not have permission to access this resource.',
          403
        );
      }
    },
  };
}

// ─── getOptionalUser ──────────────────────────────────────────────────────────

/**
 * Returns the authenticated user if present, or null if the request is unauthenticated.
 * Does NOT throw. Use for pages that support both guest and authenticated views.
 */
export async function getOptionalUser(): Promise<UserProfile | null> {
  try {
    const token =
      cookies().get(ADMIN_COOKIE)?.value ||
      cookies().get(CUSTOMER_COOKIE)?.value;
    if (!token) return null;
    return await authService.getSessionUser(token);
  } catch {
    return null;
  }
}

// ─── requireAdminOrRedirect ───────────────────────────────────────────────────

/**
 * Admin guard for use inside Next.js Server Components (pages).
 * Redirects to /login instead of throwing errors.
 */
export async function requireAdminOrRedirect(): Promise<AdminContext> {
  try {
    return await requireAdmin();
  } catch (err) {
    if (err instanceof AppError) {
      redirect('/login?error=admin_required&callbackUrl=/admin');
    }
    throw err;
  }
}
