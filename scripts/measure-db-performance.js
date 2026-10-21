/**
 * scripts/measure-db-performance.js
 *
 * Runs MongoDB explain('executionStats') on all critical read paths,
 * verifies index coverage (no COLLSCAN), and records baseline p50 and p95.
 *
 * Run: node --env-file=.env.local scripts/measure-db-performance.js
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');

async function benchmark() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { bufferCommands: false, maxPoolSize: 5 });
  console.log('Connected to MongoDB Atlas.\n');

  const db = mongoose.connection.db;

  const queries = [
    {
      name: 'Product by Slug (PDP lookup)',
      collection: 'products',
      filter: { slug: 'nocturne-heavyweight-hoodie-black' },
    },
    {
      name: 'Products by Category (PLP rail)',
      collection: 'products',
      filter: { categorySlug: 'streetwear' },
      sort: { createdAt: -1 },
      limit: 12,
    },
    {
      name: 'User by Email (Auth lookup)',
      collection: 'users',
      filter: { email: 'admin@muvera.club' },
    },
    {
      name: 'Orders by Customer Phone (Account History)',
      collection: 'orders',
      filter: { customerPhone: '9380933170' },
      sort: { createdAt: -1 },
    },
    {
      name: 'Inventory by Variant + Location (Live Stock Check)',
      collection: 'inventories',
      filter: { variantId: 'prod_hoodie_01_var_m', locationId: 'loc_blr_ind_01' },
    },
  ];

  const results = [];

  for (const q of queries) {
    const col = db.collection(q.collection);

    // Warm-up
    await col.find(q.filter).toArray();

    // Explain stats
    let cursor = col.find(q.filter);
    if (q.sort) cursor = cursor.sort(q.sort);
    if (q.limit) cursor = cursor.limit(q.limit);

    const explain = await cursor.explain('executionStats');
    const stats = explain.executionStats;
    const stage = stats.executionStages.stage;
    const isIndexScan = stage === 'FETCH' || stage === 'IXSCAN' || stage === 'LIMIT';
    const isCollscan = stage === 'COLLSCAN';

    // Latency sample over 20 iterations
    const latencies = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      let c = col.find(q.filter);
      if (q.sort) c = c.sort(q.sort);
      if (q.limit) c = c.limit(q.limit);
      await c.toArray();
      latencies.push(performance.now() - start);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)].toFixed(2);
    const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);

    results.push({
      Query: q.name,
      Stage: isCollscan ? '❌ COLLSCAN' : `✅ ${stage}`,
      nReturned: stats.nReturned,
      totalDocsExamined: stats.totalDocsExamined,
      totalKeysExamined: stats.totalKeysExamined,
      p50_ms: `${p50} ms`,
      p95_ms: `${p95} ms`,
    });
  }

  console.table(results);
  await mongoose.disconnect();
}

benchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
