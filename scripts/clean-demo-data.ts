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

const DEMO_SLUGS = [
  'nocturne-heavyweight-satin-bomber',
  'cyberpunk-acid-wash-oversized-tee',
  'midnight-velvet-heavyweight-hoodie',
  'tactical-multi-pocket-parachute-cargoes',
  'slipstream-low-retro-court-sneakers',
  'vintage-acid-wash-boxy-graphic-tee',
  'liquid-satin-cut-out-club-dress',
  'artisanal-geometric-urban-crossbody',
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set. Please provide it via environment variable or .env.local.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  console.log('--- Removing Demo Products from MongoDB Atlas ---');

  const prodResult = await db.collection('products').deleteMany({
    slug: { $in: DEMO_SLUGS },
  });
  console.log(`✓ Deleted ${prodResult.deletedCount} demo product(s).`);

  // Verification
  const remainingProducts = await db.collection('products').find({}, { projection: { title: 1, slug: 1, brand: 1, 'variants.sku': 1 } }).toArray();
  console.log(`\nRemaining Actual Products in Database (${remainingProducts.length}):`);
  remainingProducts.forEach((p: any) => {
    console.log(` - ${p.title} (${p.slug}) | Brand: ${p.brand} | SKUs: ${p.variants?.map((v: any) => v.sku).join(', ')}`);
  });

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(console.error);
