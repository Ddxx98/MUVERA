import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb+srv://MuveraClothing:Muvera2026@cluster0.ngqnann.mongodb.net/muvera?retryWrites=true&w=majority');
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
