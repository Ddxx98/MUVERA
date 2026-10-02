import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://MuveraClothing:Muvera2026@cluster0.ngqnann.mongodb.net/muvera?retryWrites=true&w=majority';
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
