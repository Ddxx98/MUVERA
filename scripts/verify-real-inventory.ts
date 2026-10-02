import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://MuveraClothing:Muvera2026@cluster0.ngqnann.mongodb.net/muvera?retryWrites=true&w=majority';
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
