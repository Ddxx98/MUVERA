# MUVERA Performance Baseline & Index Audit

## 1. Database Query Execution Stats (MongoDB Atlas)

Measured with `scripts/measure-db-performance.js` across 20 iterations per query:

| Query Pattern | Collection | Execution Stage | nReturned | totalDocsExamined | totalKeysExamined | p50 Latency | p95 Latency | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Product by Slug** (`/product/[slug]`) | `products` | `EXPRESS_IXSCAN` | Match | 0 (Index Only) | 1 | 27.49 ms | 52.16 ms | ✅ ZERO COLLSCAN |
| **Products by Category** (`/products`) | `products` | `LIMIT (IXSCAN)` | Match | <= Limit | <= Limit | 27.52 ms | 53.94 ms | ✅ ZERO COLLSCAN |
| **User by Email** (Auth & Session Check) | `users` | `EXPRESS_IXSCAN` | 1 | 0 (Index Only) | 1 | 26.19 ms | 31.74 ms | ✅ ZERO COLLSCAN |
| **Orders by Customer** (`/account/orders`) | `orders` | `FETCH (IXSCAN)` | Match | = nReturned | = nReturned | 26.00 ms | 35.33 ms | ✅ ZERO COLLSCAN |
| **Live Inventory Check** (Checkout/Cart) | `inventories` | `FETCH (IXSCAN)` | 1 | 1 | 1 | 26.08 ms | 49.88 ms | ✅ ZERO COLLSCAN |

### Key Optimizations Applied
1. **Compound Indexing (`scripts/create-indexes.js`)**:
   - `products`: `{ slug: 1 }` (unique), `{ categorySlug: 1, createdAt: -1 }`, `{ brandSlug: 1, createdAt: -1 }`, `{ isBlitzDrop: 1, createdAt: -1 }`, `{ isDealOfTheHour: 1 }`, `{ tags: 1 }`.
   - `orders`: `{ orderNo: 1 }` (unique), `{ customerPhone: 1, createdAt: -1 }`, `{ customerEmail: 1, createdAt: -1 }`, `{ fulfilmentStatus: 1, createdAt: -1 }`, `{ paymentStatus: 1, createdAt: -1 }`.
   - `inventories`: `{ variantId: 1, locationId: 1 }` (unique compound), `{ sku: 1 }`, `{ available: 1 }`.
   - `stockmovements`: `{ variantId: 1, createdAt: -1 }`, `{ referenceId: 1 }`.
   - `users`: `{ email: 1 }` (unique), `{ phone: 1 }` (unique), `{ role: 1 }`.
2. **Lean & Projected Queries**: `.lean()` utilized on read paths to bypass Mongoose hydration overhead.
3. **No Read Locking**: High-concurrency reads execute outside write transactions.

---

## 2. API Response Targets vs Baseline

| Route / Path | Target p95 | Measured Atlas Latency | Status |
| :--- | :--- | :--- | :--- |
| Public Catalog Reads (`/api/products`) | < 200 ms | ~45 ms | ✅ Passed |
| Site Settings (`/api/settings`) | < 200 ms | ~30 ms | ✅ Passed |
| Live Stock Availability (`/api/inventory`) | < 400 ms (uncached) | ~40 ms | ✅ Passed |
| Order Creation / Mutation | < 500 ms | ~75 ms | ✅ Passed |
| Admin Customer Directory (`/api/admin/customers`) | < 400 ms | ~55 ms | ✅ Passed |
