import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';

// Auto-load .env.local if present
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set. Please provide it via environment variable or .env.local.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  const products = await db.collection('products').find({}).toArray();
  console.log(`Found ${products.length} product(s) in Atlas.`);

  for (const p of products) {
    console.log(`Product: ${p.title} (${p.slug})`);
    if (Array.isArray(p.variants)) {
      for (const v of p.variants) {
        const inv = await db.collection('inventory').findOne({ sku: v.sku });
        if (!inv) {
          await db.collection('inventory').insertOne({
            variantId: v.id,
            locationId: 'loc_blr_ind_01',
            sku: v.sku,
            onHand: 15,
            reserved: 0,
            available: 15,
            lowStockThreshold: 3,
            updatedAt: new Date().toISOString(),
          });
          console.log(` + Initialized stock (15 units) for SKU: ${v.sku} (${v.size})`);
        } else {
          console.log(` = Existing stock for SKU: ${v.sku} -> ${inv.available} units`);
        }
      }
    }
  }

  const allInventory = await db.collection('inventory').find({}).toArray();
  console.log(`\nTotal Inventory Records in DB: ${allInventory.length}`);
  allInventory.forEach((item: any) => {
    console.log(` - SKU: ${item.sku} | On Hand: ${item.onHand} | Available: ${item.available}`);
  });

  await mongoose.disconnect();
  console.log('\nVerification Complete.');
}

main().catch(console.error);
