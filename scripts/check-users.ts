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

  // Delete ONLY deexith2016@gmail.com (test account, not seeded accounts)
  const result = await db.collection('users').deleteMany({
    email: { $nin: ['admin@muvera.club', 'customer@muvera.club'] }
  });
  console.log(`Deleted ${result.deletedCount} non-seeded user(s)`);

  const remaining = await db.collection('users').find({}).toArray();
  console.log('\nRemaining users:');
  remaining.forEach((u: any) => console.log(` - ${u.email} | phone: ${u.phone}`));

  await mongoose.disconnect();
  console.log('Done.');
}
main().catch(console.error);
