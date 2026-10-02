import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';

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
  const uri = process.env.MONGODB_URI || 'mongodb+srv://MuveraClothing:Muvera2026@cluster0.ngqnann.mongodb.net/muvera?retryWrites=true&w=majority';
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
