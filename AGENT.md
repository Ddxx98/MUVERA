# MUVERA — Agent Operations & Codebase Architecture Manual

> **File:** `AGENT.md`  
> **Target Audience:** Autonomous Agents, AI Coding Assistants, and Engineering Contributors  
> **Status:** Authoritative Single Source of Truth for MUVERA Architecture & Development

---

## 1. Executive Summary & Project Mission

**MUVERA** is an ultra-fast luxury streetwear & fashion commerce platform engineered for instant urban dispatch (60-minute delivery via local dark stores and national express courier dispatch).

### Core Value Propositions
- **Midnight Quick-Glam Aesthetics:** High-contrast luxury dark-mode design system with electric gold (`#FACC15`) and festive crimson (`#BA141A`) accents.
- **Hyper-Local Commerce & Dark Stores:** Real-time stock reservation with 15-minute holding locks, location-aware inventory allocation, and dark store pincode routing.
- **Instant Checkout & Indian FinTech First:** Direct UPI payment intent generation (NPCI-compliant deep links and dynamic QR scan), automated WhatsApp order booking, Cash on Delivery (COD), and Razorpay gateway integration.
- **Statutory Compliance & GST Tax Invoices:** Client-side A4 GST tax invoice generation via `jsPDF` with HSN and CGST/SGST breakdowns.
- **Two-Layer Default-Deny Security:** Edge JWT verification (Layer 1) paired with authoritative database/RBAC guards (Layer 2).
- **Responsive Layout Primitives:** Zero hardcoded pixel widths; fluid viewport math (`clamp()`, intrinsic CSS grids, `Sheet`, `Sidebar`, `Switcher`) validated by CI.

---

## 2. Technical Stack & Tooling

| Tier | Technologies / Libraries |
| :--- | :--- |
| **Framework** | Next.js 14.2.15 (App Router, Server Actions, Route Handlers, Edge Middleware) |
| **Language & Runtime** | TypeScript 5.6.3, Node.js 20+ (ESM & Edge Runtime) |
| **UI & Styling** | React 18.3, Tailwind CSS 3.4.14, Lucide React 0.453 |
| **Database & ODM** | MongoDB with Mongoose 9.10; automatic in-memory fallback for local dev when `MONGODB_URI` is omitted |
| **Security & Auth** | `jose` 6.2 (Edge-compatible JWT), Node.js `crypto` (HMAC, SHA-256 password hashing & salt), cookie isolation |
| **PDF & Documents** | `jspdf` 4.2.1 (A4 GST invoice rendering), `xlsx` 0.18.5 (bulk imports/exports) |
| **Barcodes & QR** | `qrcode` 1.5.4 (dynamic in-browser canvas and data URL generation for UPI) |
| **Notifications** | Multi-provider architecture: EmailJS (primary for 4-digit OTPs), Brevo (Sendinblue), and Console logging fallback |
| **Validation & Schema** | `zod` 4.6.5 |
| **Testing & CI Tools** | Node.js native test runner (`node:test`), Playwright for E2E responsive testing, custom layout/route linters |

---

## 3. Architecture & Security Model

MUVERA enforces strict separation of concerns across a two-layer, default-deny security model.

```
                              REQUEST LIFECYCLE
                              
  [ Client Browser / Machine ]
               │
               ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ LAYER 1: Edge Runtime Middleware (`src/middleware.ts`)       │
  │ • Route Policy Lookup (`src/config/route-policy.ts`)        │
  │ • Default-Deny: Unclassified paths return 403 Forbidden     │
  │ • Stateless JWT verification via `jose` (HS256)             │
  │ • Audience matching:                                        │
  │     - Admin routes require `aud=admin`                      │
  │     - Customer routes require `aud=customer`                │
  │ • Cross-audience rejection (Customer token on Admin = 403)  │
  │ • Adds security headers & `x-request-id` tracing UUID        │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ Forwarded with Headers
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ LAYER 2: Route Handlers / Server Actions (`guards.ts`)      │
  │ • Authoritative DB session lookup (`getUserById`)           │
  │ • Token revocation & account status validation              │
  │ • Resource Ownership Enforcement:                           │
  │     - Customer A cannot query Customer B's order/profile    │
  │     - Admin role can inspect across tenants                 │
  │ • Machine Routes: Timing-safe `CRON_SECRET` & HMAC checks   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
                     [ Business Services & DB ]
```

### 3.1 Dual-Cookie Strategy
- **Admin Session:** Stored in cookie `muvera_admin_session` (`__Host-` prefixed in production), `SameSite=Strict`, `HttpOnly`, `Secure`.
- **Customer Session:** Stored in cookie `muvera_session`, `SameSite=Lax` (necessary for seamless redirects back from WhatsApp or external UPI payment apps), `HttpOnly`, `Secure`.
- **Session Duration:** 6-hour auto-expiry with background token revocation.

### 3.2 Single Source of Truth Route Policy (`src/config/route-policy.ts`)
Every route in `src/app/**/page.tsx` and `src/app/**/route.ts` is explicitly declared in `ROUTE_POLICIES`:
- `public`: Storefront, catalog, search, public CMS settings, guest order placement.
- `customer`: Profile, cart, checkout, order success, wishlist.
- `admin`: `/admin/*` management portals, `/api/admin/*`, return resolution, order updates.
- `machine`: `/api/cron/*` (protected by constant-time `CRON_SECRET`), webhooks (HMAC-SHA256).

> **Enforcement:** `npm run check:routes` runs in CI and fails if any route file exists without a corresponding policy entry.

### 3.3 Strict Money Handling (`src/lib/money.ts`)
- All currency values are stored, calculated, and passed in **integer paise** (1 INR = 100 paise) to eliminate IEEE 754 floating-point inaccuracies.
- Helper functions: `formatPaise(paise)`, `rupeesToPaise(rupees)`, `paiseToRupees(paise)`, `calculateGstBreakdown(sellingPricePaise, gstRatePercent)`.

---

## 4. Codebase Directory Map

```
MUVERA/
├── design/                          # Design system tokens and specifications
│   ├── DESIGN.md                    # Aesthetic guidelines, color tokens, typography
│   ├── manifest.json                # Design metadata
│   └── tokens/tokens.css            # Raw CSS custom property tokens
├── docs/                            # Deep technical documentation
│   ├── auth-architecture.md         # Full authentication sequence diagrams and policy
│   ├── performance-baseline.md      # MongoDB Atlas query execution plans & latency stats
│   ├── performance-report.md        # Web Vitals & indexing audit
│   └── responsive-audit.md          # 320px-3440px viewport audit matrix
├── public/                          # Static brand assets (logo.svg, icon.svg, og-image.svg)
├── scripts/                         # Maintenance, test, and audit scripts
│   ├── check-fixed-pixels.js        # CI linter verifying no hardcoded px width/height
│   ├── check-route-policy.js        # CI linter verifying 100% route classification
│   ├── check-users.ts               # Verification of admin/customer database accounts
│   ├── clean-demo-data.ts           # DB hygiene utility
│   ├── create-indexes.js            # MongoDB Atlas compound index creator
│   ├── measure-db-performance.js    # Automated p50/p95 latency profiler
│   ├── seed-atlas.ts                # Production database seeder
│   ├── test-brevo.ts                # Brevo API integration tester
│   ├── test-database-roles.ts       # Database role permission tester
│   ├── test-db-connection.ts        # MongoDB connection and SRV DNS tester
│   ├── test-otp-flow.ts             # Auth signup & verification tester
│   ├── test-signup-otp.ts           # EmailJS / Brevo OTP dispatcher tester
│   ├── update-atlas-brands.ts       # Brand data migration script
│   ├── verify-password-reset.ts     # Password reset token flow tester
│   └── verify-real-inventory.ts     # Live inventory reconciliation tester
├── src/
│   ├── middleware.ts                # Edge Runtime Layer 1 Auth Gate
│   ├── app/                         # Next.js App Router
│   │   ├── (admin)/admin/           # Operations Dashboard & Portals
│   │   │   ├── layout.tsx           # Admin layout with RBAC guard
│   │   │   ├── page.tsx             # Executive KPI & Sales Overview
│   │   │   ├── catalog/page.tsx     # Product & Variant CRUD, Bulk Excel Upload
│   │   │   ├── customers/page.tsx   # Customer Directory, CRM & Spend Metrics
│   │   │   ├── inventory/page.tsx   # Dark Store Stock Levels & Stock Movement Logs
│   │   │   ├── merchandising/page.tsx # Blitz Drops, Hero Banners & Campaign CMS
│   │   │   ├── orders/page.tsx      # Order Fulfillment State Machine & Rider Dispatch
│   │   │   ├── returns/page.tsx     # Return Request Inspection & Restocking
│   │   │   ├── settings/page.tsx    # Storefront CMS, Payment Gateway Flags, Fees
│   │   │   └── system/page.tsx      # DB Health, Cache Stats, Cron Trigger Logs
│   │   ├── account/                 # Customer Account & Order History
│   │   │   ├── page.tsx             # Profile, Saved Addresses, Loyalty Tier
│   │   │   └── orders/              # Orders list & [id] order detail tracking
│   │   ├── api/                     # REST API & Webhook Endpoints
│   │   │   ├── admin/               # Admin endpoints (campaigns, customers, bulk, uploads)
│   │   │   ├── categories/route.ts  # Category querying
│   │   │   ├── coupons/route.ts     # Coupon discount validation
│   │   │   ├── cron/[job]/route.ts  # Background cron triggers (e.g., expire-reservations)
│   │   │   ├── inventory/route.ts   # Live inventory availability read
│   │   │   ├── orders/route.ts      # Order creation (POST) & management (GET/PATCH)
│   │   │   ├── products/route.ts    # Product catalog filter & search
│   │   │   ├── returns/route.ts     # Return creation & status management
│   │   │   ├── seed/route.ts        # Database seed endpoint
│   │   │   └── settings/route.ts    # Public CMS settings (GET) & admin updates (PUT)
│   │   ├── cart/page.tsx            # Full Cart View
│   │   ├── categories/page.tsx      # Category Hub
│   │   ├── checkout/page.tsx        # Multi-method Checkout (UPI QR, WhatsApp, COD)
│   │   ├── dev/layout/page.tsx      # Visual Layout Checker & Viewport Test Suite
│   │   ├── forgot-password/page.tsx # Password Reset Request Flow
│   │   ├── login/page.tsx           # Customer & Admin Login
│   │   ├── order-success/[id]/      # Live Order Tracking, ETA Countdown & Tax Invoice
│   │   ├── product/[slug]/          # Product Detail Page (PDP) & Size Guide
│   │   ├── products/page.tsx        # Product Listing Page (PLP) with Filters
│   │   ├── reset-password/page.tsx  # Password Reset Completion Flow
│   │   ├── search/page.tsx          # Real-time Catalog Search
│   │   ├── signup/page.tsx          # Account Registration & 4-digit OTP Verification
│   │   ├── wishlist/page.tsx        # Saved Items
│   │   ├── globals.css              # Tailwind directives & CSS custom property tokens
│   │   └── layout.tsx               # Root layout (Theme, Store, Toast Providers)
│   ├── components/
│   │   ├── admin/                   # AdminHeader, AdminShell, AdminSidebar
│   │   ├── layout/                  # Fluid primitives: Container, Stack, Row, Grid,
│   │   │                            # Sidebar, Switcher, Frame, ScrollArea,
│   │   │                            # ResponsiveTable, Sheet
│   │   ├── store/                   # StoreHeader, BottomNav, CartDrawer, ProductCard,
│   │   │                            # SizeGuideModal, Footer
│   │   └── ui/                      # Badge, Button, ThemeToggle, Toast
│   ├── config/                      # Application Configuration
│   │   ├── env.client.ts            # Client-safe environment variables
│   │   ├── env.server.ts            # Server-only environment variables
│   │   ├── env.ts                   # Combined environment abstraction
│   │   ├── route-policy.ts          # Central route security classification table
│   │   └── site.ts                  # Brand metadata, static hubs & categories
│   ├── lib/                         # Shared Utilities & Data Access
│   │   ├── counters.ts              # Atomic sequence generator (OrderNo, ReturnNo)
│   │   ├── db.ts                    # Mongoose connection + In-Memory Fallback DB
│   │   ├── errors.ts                # Standard AppError, ServiceResult, error handlers
│   │   ├── invoice-pdf.ts           # jsPDF GST A4 Tax Invoice document generator
│   │   ├── logger.ts                # Structured JSON logger with request correlation
│   │   ├── money.ts                 # Integer paise currency utilities
│   │   ├── seed-data.ts             # Initial product, catalog, and inventory seed data
│   │   ├── store-context.tsx        # Client state: cart, wishlist, live CMS settings
│   │   ├── theme-context.tsx        # Dark/light theme state & document class manager
│   │   ├── toast-context.tsx        # Toast notification system
│   │   ├── types.ts                 # Core TypeScript interfaces & domain types
│   │   ├── upi.ts                   # NPCI UPI URL builder & QR code generator
│   │   ├── whatsapp.ts              # WhatsApp booking message builder & deep links
│   │   └── models/                  # Mongoose Schemas & Models
│   │       ├── AuthToken.ts         # OTP & password reset tokens
│   │       ├── Category.ts          # Category schema
│   │       ├── Coupon.ts            # Coupon schema with usage limits
│   │       ├── Inventory.ts         # Inventory & StockMovement schemas
│   │       ├── Order.ts             # Order & OrderEvent schemas
│   │       ├── Product.ts           # Product & Variant schemas
│   │       ├── Return.ts            # ReturnRequest schema
│   │       ├── SiteSettings.ts      # Live CMS site settings schema
│   │       └── User.ts              # User schema with roles & address book
│   └── modules/                     # Domain-Driven Feature Modules
│       ├── audit/                   # Audit logging service
│       ├── auth/                    # Auth actions, crypto, guards, tokens, service
│       ├── catalog/                 # Catalog querying & product filtering service
│       ├── coupons/                 # Coupon validation & redemption service
│       ├── inventory/               # Stock hold allocation, release & movements
│       ├── jobs/                    # Scheduled job registry & background tasks
│       ├── locations/               # Dark store hubs & pincode matching service
│       ├── media/                   # Cloudinary signed upload service
│       ├── notifications/           # EmailJS, Brevo, and Console notification providers
│       ├── orders/                  # Order placement, state machine, rider assignment
│       ├── payments/                # Razorpay & WhatsApp UPI payment provider abstraction
│       ├── settings/                # Site settings & CMS configuration service
│       └── shipping/                # Delivery rates, threshold calculations, tracking
└── tests/
    ├── auth-architecture.test.js    # Unit & security test suite for auth layers
    └── e2e/
        └── responsive.spec.ts       # Playwright 320px to 3440px responsive test suite
```

---

## 5. Domain Entities & State Machines

### 5.1 Order Lifecycle & Fulfillment State Machine

```
              ┌───────────────┐
              │ unfulfilled   │ (Order placed, stock reserved)
              └───────┬───────┘
                      │ Payment confirmed / Allocated
                      ▼
              ┌───────────────┐
              │   allocated   │ (Assigned to Dark Store Hub)
              └───────┬───────┘
                      │ Picking initiated
                      ▼
              ┌───────────────┐
              │    picking    │
              └───────┬───────┘
                      │ Packed & Tagged
                      ▼
              ┌───────────────┐
              │    packed     │
              └───────┬───────┘
                      │ Handed to Courier / Express Rider
                      ▼
              ┌───────────────┐
              │    shipped    │
              └───────┬───────┘
                      │ Rider approaching customer
                      ▼
              ┌───────────────┐
              │out_for_deliv. │
              └───────┬───────┘
                      │ OTP / Delivery scan verified
                      ▼
              ┌───────────────┐
              │   delivered   │ ──(Within 7 Days)──► [ Return Requested ]
              └───────────────┘
```

### 5.2 Stock Hold & Reservation Logic
1. When a user begins checkout or submits an order, `inventoryService.reserveStock(orderId, items)` runs atomically.
2. `available` stock decreases, while `reserved` count increases. A `Reservation` record is created with an expiry time (`holdExpiryMinutes`, default 15 mins).
3. If payment succeeds, stock is committed (`reserved` decreases, `onHand` decreases, logged as `sale`).
4. If payment fails or times out, `/api/cron/expire-reservations` releases the hold, incrementing `available` and logging `release`.

### 5.3 Payment Gateways & Choices
1. **WhatsApp UPI / Direct Intent (`upi_whatsapp`):**
   - Generates NPCI-compliant URI (`upi://pay?pa=...&pn=...&am=...`).
   - Generates dynamic high-res QR code on client with `qrcode`.
   - Generates one-click WhatsApp deep link with structured itemized order summary for manual payment slip upload.
2. **Cash on Delivery (`cod_whatsapp` / `cod`):**
   - Available below threshold or governed by CMS flags (`codEnabled`).
3. **Razorpay Gateway (`razorpay`):**
   - Online card, netbanking, and UPI gateway intents.
   - Handled via provider abstraction in `src/modules/payments/`.

---

## 6. Development & Operational Runbook

### 6.1 Essential Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start Next.js development server at `http://localhost:3000` |
| `npm run build` | Next.js production build |
| `npm run start` | Start production server |
| `npm run lint` | Next.js ESLint validation |
| `npm run check:routes` | Scans all routes against `src/config/route-policy.ts` to ensure 100% security classification |
| `npm run check:layout` | Scans all components for hardcoded pixel declarations (`w-[...px]`, `h-[...px]`) |
| `npm run test:auth` | Runs the 10-point authentication security test suite using Node.js native test runner |
| `npm run typecheck` | Validates TypeScript types across the entire project (`tsc --noEmit`) |

### 6.2 Database Initialization & Maintenance

```bash
# Seed local or Atlas MongoDB with initial catalog, dark store inventory, admin user & settings:
node --env-file=.env.local scripts/seed-atlas.ts

# Create compound indexes on MongoDB Atlas to eliminate COLLSCAN and accelerate queries:
node --env-file=.env.local scripts/create-indexes.js

# Measure database p50 and p95 query latency:
node --env-file=.env.local scripts/measure-db-performance.js

# Reconcile inventory discrepancies:
node --env-file=.env.local scripts/verify-real-inventory.ts
```

### 6.3 Environment Variables Reference (`.env.example`)

```env
# Business & UPI Details
NEXT_PUBLIC_WHATSAPP_NUMBER=919380933170
NEXT_PUBLIC_BUSINESS_NAME="MUVERA Luxury Streetwear"
NEXT_PUBLIC_BUSINESS_UPI_ID=muvera.store@upi
NEXT_PUBLIC_SUPPORT_EMAIL=support@muvera.club
NEXT_PUBLIC_DEFAULT_LOCATION="Indiranagar Dark Store (Bengaluru)"

# Commerce Pricing & Delivery Rules (in integer Paise)
NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_PAISE=99900    # ₹999 free shipping threshold
NEXT_PUBLIC_EXPRESS_DELIVERY_FEE_PAISE=9900        # ₹99 express delivery fee
NEXT_PUBLIC_HOLD_EXPIRY_MINUTES=15                 # 15-minute stock hold

# Database
MONGODB_URI=mongodb+srv://...                      # Leave blank to use in-memory DB for local dev

# Cloudinary (Media CDN)
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=demo

# Security & Secrets
ADMIN_SECRET_KEY=muvera_admin_master_secret_2026
NEXTAUTH_SECRET=muvera_nextauth_jwt_super_secret_key
NEXTAUTH_URL=http://localhost:3000
CRON_SECRET=muvera_cron_secret_internal_2026

# Email / Notifications (emailjs, brevo, or console)
EMAIL_PROVIDER=console
BREVO_API_KEY=
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
EMAILJS_PUBLIC_KEY=
EMAILJS_PRIVATE_KEY=
```

---

## 7. Golden Rules for AI Agents Working on MUVERA

When making changes to this codebase, every agent MUST follow these non-negotiable guidelines:

1. **Always Use Integer Paise for Money:**
   Never store prices or order values as floating-point INR rupees. Always use integer paise (`pricePaise`, `mrpPaise`, `discountPaise`). Use `formatPaise()` for UI display.
2. **Never Add Unclassified Routes:**
   Whenever creating a new `page.tsx` or `route.ts`, immediately add a corresponding regex entry to `ROUTE_POLICIES` in `src/config/route-policy.ts`. Run `npm run check:routes` to verify.
3. **Preserve Two-Layer Auth Integrity:**
   - Never import Mongoose or Node.js filesystem modules into `src/middleware.ts` (it runs on the Edge Runtime).
   - Never rely solely on Layer 1 middleware for database permissions. Always invoke `requireAdmin()` or `requireCustomer()` in Server Actions or Route Handlers (Layer 2).
   - Maintain audience token separation (`aud=admin` vs `aud=customer`).
4. **Zero Hardcoded Pixel Dimensions in Layouts:**
   Do not write utility classes like `w-[350px]` or `h-[500px]` in UI layouts. Use responsive tokens, percentage/viewport math, or components from `src/components/layout/` (`Container`, `Stack`, `Row`, `Grid`, `Sidebar`, `Switcher`, `Sheet`, `Frame`). Run `npm run check:layout` to verify.
5. **Multi-Location Inventory Safety:**
   Always perform stock deductions and reservations through `inventoryService` to guarantee atomic operations and stock movement audit logs.
6. **Preserve In-Memory DB Fallback:**
   Keep `src/lib/db.ts` resilient. Local developers without active MongoDB Atlas clusters rely on the in-memory fallback. Ensure database queries handle both Mongoose models and in-memory array fallbacks gracefully.
7. **Never Filter Large Collections in JavaScript Memory:**
   Always push filters down to MongoDB via `db.getProducts(options)`, `db.getOrders(options)`, and `getUserByEmailOrPhone()` so queries hit compound indexes (`IXSCAN`) and avoid memory exhaustion.
8. **Test Before Hand-off:**
   Always run `npm run check:routes`, `npm run check:layout`, and `npm run test:auth` after making architectural modifications.
