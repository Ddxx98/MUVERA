/**
 * Route Policy — Single Source of Truth for MUVERA
 *
 * Every page and API route in the application MUST appear here.
 * The CI script (scripts/check-route-policy.js) scans all
 * page.tsx and route.ts files and FAILS if any route is missing.
 *
 * Route classes:
 *  - public   : No auth required. Anyone may access.
 *  - customer : Must have a valid customer session (aud=customer).
 *  - admin    : Must have a valid admin session (aud=admin).
 *  - machine  : No cookies. Verified by HMAC signature or shared secret inside the handler.
 */

export type RouteClass = 'public' | 'customer' | 'admin' | 'machine';

export interface RoutePolicy {
  /** Pattern to match against the request pathname */
  pattern: RegExp;
  class: RouteClass;
  /** Short human-readable description for audit docs */
  description: string;
}

/**
 * ROUTE POLICY TABLE
 * Order matters: first match wins.
 */
export const ROUTE_POLICIES: RoutePolicy[] = [
  // ─── Static / Next.js internals (always skip) ─────────────────────────────
  { pattern: /^\/_next\//, class: 'public', description: 'Next.js internal static assets' },
  { pattern: /^\/favicon/, class: 'public', description: 'Favicon' },
  { pattern: /^\/icon/, class: 'public', description: 'App icon' },
  { pattern: /^\/manifest/, class: 'public', description: 'Web app manifest' },
  { pattern: /^\/robots\.txt$/, class: 'public', description: 'SEO robots.txt' },
  { pattern: /^\/sitemap\.xml$/, class: 'public', description: 'SEO sitemap' },

  // ─── Machine routes (no cookies; verified by signature/secret in handler) ──
  { pattern: /^\/api\/cron\//, class: 'machine', description: 'Background cron jobs; verified by CRON_SECRET' },
  { pattern: /^\/api\/webhooks\/logistics/, class: 'machine', description: 'Shiprocket logistics webhooks; timing-safe secret verified' },
  { pattern: /^\/api\/webhooks\/razorpay/, class: 'machine', description: 'Razorpay payment webhooks; HMAC-SHA256 verified' },
  { pattern: /^\/api\/payments\/razorpay\/webhook$/, class: 'machine', description: 'Razorpay payment webhook; HMAC-SHA256 verified' },
  { pattern: /^\/api\/webhooks\/brevo/, class: 'machine', description: 'Brevo email webhooks; key verified' },
  { pattern: /^\/api\/seed/, class: 'machine', description: 'Seed route; dev/test only' },

  // ─── Admin API routes ──────────────────────────────────────────────────────
  { pattern: /^\/api\/admin\//, class: 'admin', description: 'Admin REST API; require aud=admin session' },
  { pattern: /^\/api\/shipping\/label\//, class: 'admin', description: 'Shipping label PDF proxy; require admin session' },
  { pattern: /^\/api\/returns$/, class: 'admin', description: 'Returns GET/PATCH for admin inspection; POST is customer' },

  // ─── Public & Customer Storefront API routes ────────────────────────────────
  { pattern: /^\/api\/settings$/, class: 'public', description: 'Settings GET is public for storefront CMS, PUT is admin-only (checked in handler)' },
  { pattern: /^\/api\/orders$/, class: 'public', description: 'Orders API: POST creates order, GET returns customer/admin orders, PATCH requires admin' },
  { pattern: /^\/api\/orders\/[^/]+\/cod-confirm$/, class: 'customer', description: 'COD email OTP send and verify' },
  { pattern: /^\/api\/orders\/[^/]+\/cancel$/, class: 'customer', description: 'Customer or admin order cancellation' },
  { pattern: /^\/api\/payments\/razorpay\/create-order$/, class: 'public', description: 'Create Razorpay order for direct payment' },
  { pattern: /^\/api\/create-order$/, class: 'public', description: 'Create Razorpay standard web checkout order' },
  { pattern: /^\/api\/verify-payment$/, class: 'public', description: 'Verify Razorpay payment HMAC signature' },
  { pattern: /^\/api\/inventory$/, class: 'public', description: 'Inventory availability read; public for storefront' },
  { pattern: /^\/api\/shipping\/serviceability/, class: 'public', description: 'Pincode delivery & COD serviceability check' },
  { pattern: /^\/api\/shipping\/ndr/, class: 'public', description: 'NDR customer reattempt dispatch; verified by signed token' },
  { pattern: /^\/api\/categories$/, class: 'public', description: 'Category list' },
  { pattern: /^\/api\/products/, class: 'public', description: 'Product catalog' },
  { pattern: /^\/api\/coupons/, class: 'public', description: 'Coupon validation' },

  // ─── Admin pages ───────────────────────────────────────────────────────────
  { pattern: /^\/admin/, class: 'admin', description: 'Admin portal pages; require aud=admin session' },

  // ─── Customer pages ────────────────────────────────────────────────────────
  { pattern: /^\/cart$/, class: 'customer', description: 'Shopping cart; may have guest session' },
  { pattern: /^\/checkout$/, class: 'customer', description: 'Checkout; requires customer session or guest' },
  { pattern: /^\/order-success\//, class: 'customer', description: 'Order confirmation; require ownership' },
  { pattern: /^\/wishlist$/, class: 'customer', description: 'Wishlist; requires customer session' },
  { pattern: /^\/account/, class: 'customer', description: 'Account pages; strict ownership enforcement' },

  // ─── Public pages ──────────────────────────────────────────────────────────
  { pattern: /^\/$/, class: 'public', description: 'Storefront home' },
  { pattern: /^\/shipping\/ndr/, class: 'public', description: 'NDR customer reattempt landing page' },
  { pattern: /^\/products/, class: 'public', description: 'Product listing pages' },
  { pattern: /^\/product\//, class: 'public', description: 'Product detail pages' },
  { pattern: /^\/categories$/, class: 'public', description: 'Category hub' },
  { pattern: /^\/search/, class: 'public', description: 'Search' },
  { pattern: /^\/login$/, class: 'public', description: 'Customer login' },
  { pattern: /^\/signup$/, class: 'public', description: 'Customer signup' },
  { pattern: /^\/forgot-password$/, class: 'public', description: 'Password reset request' },
  { pattern: /^\/reset-password$/, class: 'public', description: 'Password reset completion' },
  { pattern: /^\/dev\//, class: 'public', description: 'Dev tools (layout checker, etc.)' },
];

/**
 * Resolves the route policy class for a given pathname.
 * Returns null if no policy matches (unclassified — default DENY).
 */
export function resolveRoutePolicy(pathname: string): RoutePolicy | null {
  return ROUTE_POLICIES.find((p) => p.pattern.test(pathname)) ?? null;
}
