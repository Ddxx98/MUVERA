/**
 * MUVERA — Edge Middleware (Layer 1 Auth Gate)
 *
 * Runs on Next.js Edge Runtime (no Node.js APIs, no Mongoose, no DB calls).
 * Uses `jose` for lightweight JWT verification.
 *
 * Two-layer, default-deny auth:
 *  • Layer 1 (here): Verify the signed JWT — signature, expiry, issuer, audience.
 *    Admin routes require aud=admin token (ADMIN_SESSION_SECRET).
 *    Customer routes require aud=customer token (SESSION_SECRET).
 *    Cross-use is rejected immediately.
 *  • Layer 2 (inside handlers & Server Actions): requireAdmin / requireCustomer
 *    perform the authoritative DB session lookup, revocation check, and RBAC.
 *
 * No database calls. No Mongoose imports. Fast enough to run on every request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose/jwt/verify';
import type { JWTPayload } from 'jose';
import { resolveRoutePolicy } from '@/config/route-policy';

// ─── Cookie names ──────────────────────────────────────────────────────────────
const ADMIN_COOKIE = 'muvera_admin_session'; // __Host- prefix applied in production
const CUSTOMER_COOKIE = 'muvera_session';

// ─── Secrets (Edge-compatible: must be Uint8Array) ──────────────────────────────
function getSecret(raw: string | undefined, fallback: string): Uint8Array {
  return new TextEncoder().encode(raw || fallback);
}

// ─── Security headers applied to every response ───────────────────────────────
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );
  return response;
}

// ─── Attach unique request ID for distributed tracing ─────────────────────────
function withRequestId(response: NextResponse, reqId: string): NextResponse {
  response.headers.set('x-request-id', reqId);
  return response;
}

function generateReqId(): string {
  // crypto.randomUUID() is available in the Edge runtime
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `req_${Date.now().toString(36)}`;
}

// ─── JWT verification helpers ─────────────────────────────────────────────────
interface MuveraJWT extends JWTPayload {
  role?: string;
}

async function verifyToken(
  token: string,
  secret: Uint8Array,
  expectedAudience: string
): Promise<MuveraJWT | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'muvera',
      audience: expectedAudience,
    });
    return payload as MuveraJWT;
  } catch {
    return null;
  }
}

// ─── Response helpers ─────────────────────────────────────────────────────────
function unauthorizedJson(reqId: string, message = 'Authentication required'): NextResponse {
  const res = NextResponse.json({ error: message }, { status: 401 });
  applySecurityHeaders(res);
  withRequestId(res, reqId);
  return res;
}

function forbiddenJson(reqId: string, message = 'Forbidden'): NextResponse {
  const res = NextResponse.json({ error: message }, { status: 403 });
  applySecurityHeaders(res);
  withRequestId(res, reqId);
  return res;
}

function redirectToLogin(req: NextRequest, reqId: string, error?: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('callbackUrl', req.nextUrl.pathname);
  if (error) url.searchParams.set('error', error);
  const res = NextResponse.redirect(url);
  applySecurityHeaders(res);
  withRequestId(res, reqId);
  return res;
}

// ─── Main middleware function ─────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const reqId = generateReqId();
  const pathname = req.nextUrl.pathname;

  // Resolve the route policy (or deny by default if unclassified)
  const policy = resolveRoutePolicy(pathname);

  // Unclassified routes → default deny
  if (!policy) {
    const isApi = pathname.startsWith('/api/');
    if (isApi) return forbiddenJson(reqId, 'Route not found or access denied');
    const res = NextResponse.redirect(new URL('/', req.url));
    applySecurityHeaders(res);
    withRequestId(res, reqId);
    return res;
  }

  // Public and machine routes pass through (no token check at edge)
  if (policy.class === 'public' || policy.class === 'machine') {
    const res = NextResponse.next();
    applySecurityHeaders(res);
    withRequestId(res, reqId);
    // Forward request ID for use in handlers
    res.headers.set('x-muvera-req-id', reqId);
    return res;
  }

  const isApi = pathname.startsWith('/api/');
  const adminSecret = getSecret(
    process.env.ADMIN_SESSION_SECRET,
    'muvera_admin_session_jwt_secret_2026'
  );
  const customerSecret = getSecret(
    process.env.SESSION_SECRET,
    'muvera_customer_session_secret_2026'
  );

  // ─── Admin routes ────────────────────────────────────────────────────────
  if (policy.class === 'admin') {
    const adminToken =
      req.cookies.get(ADMIN_COOKIE)?.value ||
      req.cookies.get(CUSTOMER_COOKIE)?.value; // will be verified against admin secret; cross-token → null

    if (!adminToken) {
      if (isApi) return unauthorizedJson(reqId, 'Admin authentication required');
      return redirectToLogin(req, reqId, 'admin_required');
    }

    // Try admin token first
    const adminPayload = await verifyToken(adminToken, adminSecret, 'admin');

    if (!adminPayload) {
      // Explicitly check: maybe a customer token was used on an admin route
      const customerPayload = await verifyToken(adminToken, customerSecret, 'customer');
      if (customerPayload) {
        // Cross-token attack: customer token on admin route
        if (isApi) return forbiddenJson(reqId, 'Forbidden: customer token cannot access admin resources');
        return redirectToLogin(req, reqId, 'admin_required');
      }
      // No valid token at all
      if (isApi) return unauthorizedJson(reqId, 'Invalid or expired admin session');
      return redirectToLogin(req, reqId, 'session_expired');
    }

    // Valid admin token — forward with context headers for Layer 2
    const res = NextResponse.next();
    applySecurityHeaders(res);
    withRequestId(res, reqId);
    res.headers.set('x-muvera-req-id', reqId);
    res.headers.set('x-muvera-user-id', String(adminPayload.sub || ''));
    res.headers.set('x-muvera-role', 'admin');
    return res;
  }

  // ─── Customer routes ─────────────────────────────────────────────────────
  if (policy.class === 'customer') {
    const customerToken = req.cookies.get(CUSTOMER_COOKIE)?.value;

    if (!customerToken) {
      // Cart and checkout allow unauthenticated/guest access from the client
      // (Layer 2 inside the page/action does the ownership check)
      // For API calls, require authentication.
      if (isApi) return unauthorizedJson(reqId, 'Customer authentication required');
      // Pages: allow through (client-side handles guest fallback or redirect)
      const res = NextResponse.next();
      applySecurityHeaders(res);
      withRequestId(res, reqId);
      return res;
    }

    // Check for admin token mistakenly on customer route
    const adminPayload = await verifyToken(customerToken, adminSecret, 'admin');
    if (adminPayload) {
      // Admin using customer route with their admin token — not an attack, allow through
      // Layer 2 will validate further if needed
      const res = NextResponse.next();
      applySecurityHeaders(res);
      withRequestId(res, reqId);
      res.headers.set('x-muvera-req-id', reqId);
      res.headers.set('x-muvera-user-id', String(adminPayload.sub || ''));
      res.headers.set('x-muvera-role', 'admin');
      return res;
    }

    const customerPayload = await verifyToken(customerToken, customerSecret, 'customer');

    if (!customerPayload) {
      // Invalid or expired token
      if (isApi) return unauthorizedJson(reqId, 'Invalid or expired customer session');
      // For pages, allow through — Layer 2 will redirect after server component check
      const res = NextResponse.next();
      applySecurityHeaders(res);
      withRequestId(res, reqId);
      return res;
    }

    // Valid customer token
    const res = NextResponse.next();
    applySecurityHeaders(res);
    withRequestId(res, reqId);
    res.headers.set('x-muvera-req-id', reqId);
    res.headers.set('x-muvera-user-id', String(customerPayload.sub || ''));
    res.headers.set('x-muvera-role', 'customer');
    return res;
  }

  // Fallback (should never reach here)
  return forbiddenJson(reqId, 'Access denied');
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (Next.js build output)
     * - _next/image (image optimization)
     * - favicon.ico, icon.svg, apple-touch-icon
     * - .map, .css, .js, .txt, .xml static extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-touch-icon|.*\\.(?:map|css|txt|xml|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)).*)',
  ],
};
