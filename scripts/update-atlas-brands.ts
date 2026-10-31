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

  // Update all products in MongoDB Atlas to brand: 'MUVERA', brandSlug: 'muvera'
  const result = await db.collection('products').updateMany(
    {},
    {
      $set: {
        brand: 'MUVERA',
        brandSlug: 'muvera',
      }
    }
  );

  console.log(`Updated ${result.modifiedCount} product(s) to brand: 'MUVERA' in MongoDB Atlas.`);

  const sampleProducts = await db.collection('products').find({}, { projection: { title: 1, brand: 1, brandSlug: 1 } }).toArray();
  console.log('\nAtlas Products verification:');
  sampleProducts.forEach((p: any) => console.log(` - ${p.title} -> Brand: ${p.brand} (${p.brandSlug})`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(console.error);
