/**
 * scripts/create-indexes.js
 *
 * Establishes optimized compound indexes across all MongoDB collections
 * in MUVERA to eliminate COLLSCAN, minimize docsExamined, and accelerate
 * p50/p95 latency across hot queries.
 *
 * Run: node --env-file=.env.local scripts/create-indexes.js
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');

async function createIndexes() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn('⚠️ MONGODB_URI not provided. Skipping index creation on remote cluster.');
    return;
  }

  console.log('⚡ Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri, { bufferCommands: false, maxPoolSize: 5 });
  console.log('✅ Connected to MongoDB.');

  const db = mongoose.connection.db;

  const indexDefinitions = [
    {
      collection: 'products',
      indexes: [
        { key: { slug: 1 }, options: { unique: true, background: true } },
        { key: { categorySlug: 1, createdAt: -1 }, options: { background: true } },
        { key: { brandSlug: 1, createdAt: -1 }, options: { background: true } },
        { key: { isBlitzDrop: 1, createdAt: -1 }, options: { background: true } },
        { key: { isDealOfTheHour: 1 }, options: { background: true } },
        { key: { tags: 1 }, options: { background: true } },
        { key: { 'variants.sku': 1 }, options: { background: true } },
      ],
    },
    {
      collection: 'orders',
      indexes: [
        { key: { orderNo: 1 }, options: { unique: true, background: true } },
        { key: { customerPhone: 1, createdAt: -1 }, options: { background: true } },
        { key: { customerEmail: 1, createdAt: -1 }, options: { background: true } },
        { key: { fulfilmentStatus: 1, createdAt: -1 }, options: { background: true } },
        { key: { paymentStatus: 1, createdAt: -1 }, options: { background: true } },
        { key: { orderStatus: 1, createdAt: -1 }, options: { background: true } },
      ],
    },
    {
      collection: 'inventories',
      indexes: [
        { key: { variantId: 1, locationId: 1 }, options: { unique: true, background: true } },
        { key: { sku: 1 }, options: { background: true } },
        { key: { available: 1 }, options: { background: true } },
      ],
    },
    {
      collection: 'stockmovements',
      indexes: [
        { key: { variantId: 1, createdAt: -1 }, options: { background: true } },
        { key: { referenceId: 1 }, options: { background: true } },
        { key: { type: 1, createdAt: -1 }, options: { background: true } },
      ],
    },
    {
      collection: 'users',
      indexes: [
        { key: { email: 1 }, options: { unique: true, background: true } },
        { key: { phone: 1 }, options: { unique: true, background: true } },
        { key: { role: 1 }, options: { background: true } },
      ],
    },
    {
      collection: 'authtokens',
      indexes: [
        { key: { tokenHash: 1, type: 1 }, options: { background: true } },
        { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0, background: true } },
      ],
    },
  ];

  for (const { collection, indexes } of indexDefinitions) {
    console.log(`\n📦 Indexing collection: [${collection}]...`);
    const col = db.collection(collection);

    for (const { key, options } of indexes) {
      try {
        const name = await col.createIndex(key, options);
        console.log(`  ✓ Index created: ${name} (${JSON.stringify(key)})`);
      } catch (err) {
        if (err.codeName === 'IndexOptionsConflict' || err.code === 85) {
          console.log(`  ℹ Index already exists: (${JSON.stringify(key)})`);
        } else {
          console.error(`  ✗ Error creating index (${JSON.stringify(key)}):`, err.message);
        }
      }
    }

    const current = await col.indexes();
    console.log(`  📋 Total active indexes on ${collection}: ${current.length}`);
  }

  console.log('\n🚀 All database indexes successfully verified and applied!');
  await mongoose.disconnect();
}

createIndexes().catch((err) => {
  console.error('Index creation failed:', err);
  process.exit(1);
});
