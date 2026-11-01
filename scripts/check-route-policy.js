#!/usr/bin/env node
/**
 * scripts/check-route-policy.js
 *
 * CI check: scans all Next.js App Router pages and route handlers
 * and verifies that every discovered route is classified in
 * src/config/route-policy.ts.
 *
 * Exits with code 1 if any route is unclassified.
 *
 * Run: node scripts/check-route-policy.js
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', 'src', 'app');

// ─── Route classification (keep in sync with src/config/route-policy.ts) ───────
const ROUTE_POLICIES = [
  // Next.js internals
  /^\/_next\//,
  /^\/favicon/,
  /^\/icon/,
  /^\/manifest/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,

  // Machine routes
  /^\/api\/cron\//,
  /^\/api\/webhooks\//,
  /^\/api\/payments\/razorpay\/webhook/,
  /^\/api\/seed/,

  // Admin API routes
  /^\/api\/admin\//,
  /^\/api\/orders$/,
  /^\/api\/orders\/[^/]+\/cancel/,
  /^\/api\/orders\/[^/]+\/cod-confirm/,
  /^\/api\/payments\/razorpay\/create-order/,
  /^\/api\/returns$/,
  /^\/api\/settings$/,
  /^\/api\/inventory$/,
  /^\/api\/shipping\/label\//,

  // Public API routes
  /^\/api\/categories$/,
  /^\/api\/products/,
  /^\/api\/coupons/,
  /^\/api\/shipping\/serviceability/,
  /^\/api\/shipping\/ndr/,
  /^\/api\/create-order$/,
  /^\/api\/verify-payment$/,

  // Admin pages
  /^\/admin/,

  // Customer pages
  /^\/cart$/,
  /^\/checkout$/,
  /^\/order-success\//,
  /^\/wishlist$/,
  /^\/account/,

  // Public pages
  /^\/$/,
  /^\/shipping\/ndr/,
  /^\/products/,
  /^\/product\//,
  /^\/categories$/,
  /^\/search/,
  /^\/login$/,
  /^\/signup$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/dev\//,
];

function fileSystemPathToRoute(filePath) {
  // Convert filesystem path to Next.js route pattern
  let route = filePath
    .replace(APP_DIR, '')
    .replace(/\\/g, '/')
    // Remove group layout segments (parentheses)
    .replace(/\/\([^)]+\)/g, '')
    // Remove /page.tsx and /route.ts suffixes
    .replace(/\/(page|route)\.(tsx?|jsx?)$/, '')
    // Normalize dynamic segments
    .replace(/\[([^\]]+)\]/g, ':$1');

  // Root page
  if (route === '' || route === '/') return '/';

  // Ensure leading slash
  if (!route.startsWith('/')) route = '/' + route;

  return route;
}

function scanDirectory(dir) {
  const routes = [];
  if (!fs.existsSync(dir)) return routes;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...scanDirectory(fullPath));
    } else if (
      entry.isFile() &&
      (entry.name === 'page.tsx' ||
        entry.name === 'page.jsx' ||
        entry.name === 'route.ts' ||
        entry.name === 'route.js')
    ) {
      routes.push(fullPath);
    }
  }

  return routes;
}

function isClassified(routePath) {
  return ROUTE_POLICIES.some((pattern) => pattern.test(routePath));
}

// Main
const files = scanDirectory(APP_DIR);
const unclassified = [];

for (const file of files) {
  const routePath = fileSystemPathToRoute(file);
  if (!isClassified(routePath)) {
    unclassified.push({ file: path.relative(process.cwd(), file), route: routePath });
  }
}

if (unclassified.length > 0) {
  console.error('\n❌ UNCLASSIFIED ROUTES DETECTED\n');
  console.error('The following routes are not classified in src/config/route-policy.ts:');
  console.error('Add each route to the ROUTE_POLICIES array before deploying.\n');
  for (const { file, route } of unclassified) {
    console.error(`  Route: ${route}`);
    console.error(`  File:  ${file}\n`);
  }
  process.exit(1);
} else {
  const routeCount = files.length;
  console.log(`✅ All ${routeCount} route(s) are classified in src/config/route-policy.ts`);
  process.exit(0);
}
