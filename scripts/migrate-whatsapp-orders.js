#!/usr/bin/env node
/**
 * scripts/migrate-whatsapp-orders.js
 *
 * Safe audited migration for legacy WhatsApp orders.
 *
 * Invariants (Plan v5 Errata #7 & Amendment #6):
 * 1. Default mode is --dry-run.
 * 2. Requires --apply --confirm-db=<DB_NAME> to write.
 * 3. Dumps snapshot to data/backups/whatsapp_orders_<timestamp>.json.
 * 4. TAGS ONLY: sets migrationTag = 'whatsapp_v1' and migrationReviewStatus = 'pending_admin_action'.
 *    NEVER directly alters fulfilmentStatus, commits stock, or cancels orders.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch (e) {
  // Ignore if dotenv is not present
}

// Read command line arguments
const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const confirmDbArg = args.find((a) => a.startsWith('--confirm-db='));
const confirmedDbName = confirmDbArg ? confirmDbArg.split('=')[1] : null;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('───────────────────────────────────────────────────────');
  console.log('MUVERA Legacy WhatsApp Orders Migration Script');
  console.log(`Execution Mode: ${isApply ? 'APPLY (LIVE WRITE)' : 'DRY RUN (READ ONLY)'}`);
  console.log('───────────────────────────────────────────────────────');

  if (!MONGODB_URI) {
    console.log('ℹ️ Notice: MONGODB_URI is not configured in environment or .env.local.');
    console.log('Provide MONGODB_URI to execute against your staging or production cluster:');
    console.log('  MONGODB_URI="<your-connection-string>" node scripts/migrate-whatsapp-orders.js [--apply --confirm-db=<DB_NAME>]\n');
    return;
  }

  await mongoose.connect(MONGODB_URI);
  const dbName = mongoose.connection.name;
  console.log(`Connected to database: "${dbName}"`);

  if (isApply) {
    if (!confirmedDbName) {
      console.error('❌ ERROR: Live execution requires --confirm-db=<DB_NAME>.');
      process.exit(1);
    }
    if (confirmedDbName !== dbName) {
      console.error(`❌ ERROR: DB name mismatch. Expected "${confirmedDbName}", connected to "${dbName}".`);
      process.exit(1);
    }
    console.log(`✅ Confirmation validated: --confirm-db matches connected database "${dbName}".`);
  }

  const db = mongoose.connection.db;
  const ordersCollection = db.collection('orders');

  // Find legacy orders (either upi_whatsapp, cod_whatsapp, or missing idempotencyKey)
  const query = {
    $or: [
      { paymentPreference: { $in: ['upi_whatsapp', 'cod_whatsapp'] } },
      { paymentStatus: 'pending_whatsapp' },
      { migrationTag: { $exists: false } },
    ],
  };

  const matchedOrders = await ordersCollection.find(query).toArray();
  console.log(`Discovered ${matchedOrders.length} candidate legacy order(s).`);

  if (matchedOrders.length === 0) {
    console.log('No legacy orders require migration tagging.');
    await mongoose.disconnect();
    return;
  }

  // Ensure backup directory exists
  const backupDir = path.join(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `whatsapp_orders_${timestamp}.json`);

  // Write protected local snapshot
  fs.writeFileSync(backupPath, JSON.stringify(matchedOrders, null, 2), { mode: 0o600 });
  console.log(`📁 Protected snapshot created at: ${backupPath} (mode 600)`);

  if (!isApply) {
    console.log('\n[DRY RUN SUMMARY]:');
    console.log(`- Matched Orders: ${matchedOrders.length}`);
    console.log('- Proposed Action: Tag with migrationTag="whatsapp_v1", migrationReviewStatus="pending_admin_action".');
    console.log('- Zero modifications made to database.');
    console.log('\nTo execute live tagging, re-run with:');
    console.log(`  node scripts/migrate-whatsapp-orders.js --apply --confirm-db=${dbName}\n`);
    await mongoose.disconnect();
    return;
  }

  // LIVE WRITE: TAG ONLY (never mutate fulfilmentStatus or cancel orders)
  const result = await ordersCollection.updateMany(
    {
      _id: { $in: matchedOrders.map((o) => o._id) },
      migrationTag: { $exists: false },
    },
    {
      $set: {
        migrationTag: 'whatsapp_v1',
        migrationReviewStatus: 'pending_admin_action',
        updatedAt: new Date(),
      },
    }
  );

  console.log(`\n✅ Migration tagging complete. Tagged ${result.modifiedCount} order(s).`);
  console.log('Orders are now queued in Admin "Legacy Review Desk" for formal audit review.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
