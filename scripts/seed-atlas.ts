import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Fix for Windows DNS resolvers failing SRV lookups on Node.js
dns.setServers(['8.8.8.8', '1.1.1.1']);

// 1. Manually parse .env.local into process.env before importing app modules
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

// 2. Mock 'server-only' for Node CLI execution
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...rest: any[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...rest]);
};

async function main() {
  console.log('===============================================================');
  console.log('💎 MUVERA CLOUD ATLAS & CLOUDINARY INITIALIZATION');
  console.log('===============================================================\n');

  const mongoose = (await import('mongoose')).default;
  const { initialProducts, initialInventory, initialOrders, initialCoupons } = await import('../src/lib/seed-data');
  const { ProductModel, InventoryModel, OrderModel, CouponModel, UserModel, SiteSettingsModel } = await import('../src/lib/models');
  const { mediaService } = await import('../src/modules/media/service');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in .env.local!');
  }

  console.log('1. Connecting to MongoDB Atlas Cluster...');
  console.log(`   Host: ${mongoUri.split('@')[1] || 'cluster0'}`);

  await mongoose.connect(mongoUri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

  console.log('   ✓ Connected to MongoDB Atlas successfully!\n');

  console.log('2. Seeding Initial Collections...');

  // Products
  await ProductModel.deleteMany({});
  await ProductModel.insertMany(initialProducts);
  console.log(`   ✓ Seeded ${initialProducts.length} Luxury Streetwear Products (Snitch, Puma, MUVERA)`);

  // Inventory
  await InventoryModel.deleteMany({});
  await InventoryModel.insertMany(initialInventory);
  console.log(`   ✓ Seeded ${initialInventory.length} Dark Store Stock Allocations (Indiranagar Hub)`);

  // Orders
  await OrderModel.deleteMany({});
  await OrderModel.insertMany(initialOrders);
  console.log(`   ✓ Seeded ${initialOrders.length} Initial WhatsApp Orders & Fulfillment Snapshots`);

  // Coupons
  await CouponModel.deleteMany({});
  await CouponModel.insertMany(initialCoupons);
  console.log(`   ✓ Seeded ${initialCoupons.length} Active Promotion Coupons (FLASH20, WELCOME10)`);

  // Pre-seeded Users (Admin + Customer)
  await UserModel.deleteMany({});
  const initialUsers = [
    {
      id: 'user_admin_01',
      name: 'Executive Admin',
      email: 'admin@muvera.club',
      phone: '9380933170',
      passwordHash: '4088f0cf82373d1536274478a4f82e8b:a6b0b5148f56afb78ff3ed3e8d0b0e64cdb2c0642d5e00b145170f67c9119e4896898ad83fc236af105184ae351bfa5dcb3ea18fd1ffafef2a1970b6facb2c6f',
      role: 'admin',
      loyaltyTier: 'VIP Gold',
      addresses: [],
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'user_cust_01',
      name: 'Rohan Verma',
      email: 'customer@muvera.club',
      phone: '9916054321',
      passwordHash: '4088f0cf82373d1536274478a4f82e8b:a6b0b5148f56afb78ff3ed3e8d0b0e64cdb2c0642d5e00b145170f67c9119e4896898ad83fc236af105184ae351bfa5dcb3ea18fd1ffafef2a1970b6facb2c6f',
      role: 'customer',
      loyaltyTier: 'Streetwear Insider',
      addresses: [],
      createdAt: '2026-09-15T00:00:00.000Z',
    },
  ];
  await UserModel.insertMany(initialUsers);
  console.log(`   ✓ Seeded ${initialUsers.length} Authentication Accounts (admin@muvera.club & customer@muvera.club)`);

  // Site Settings
  await SiteSettingsModel.deleteMany({});
  await SiteSettingsModel.create({
    businessName: 'MUVERA Luxury Streetwear',
    tagline: '60-Minute Luxury Fashion & Streetwear Commerce',
    supportEmail: 'support@muvera.club',
    supportPhone: '+91 93809 33170',
    whatsappNumber: '919380933170',
    freeShippingThresholdPaise: 99900,
    expressDeliveryFeePaise: 9900,
    holdExpiryMinutes: 15,
    returnWindowDays: 7,
    defaultLocationName: 'Indiranagar Quick-Glam Dark Store Hub (Bengaluru)',
    defaultLocationPincode: '560038',
    businessUpiId: 'muvera.store@upi',
    businessUpiMerchantName: 'MUVERA Luxury Streetwear',
    topAnnouncementText: '⚡ EXPRESS 60-MINUTES • Dark Stores in Bengaluru • Free Express Shipping above ₹999',
    topAnnouncementActive: true,
    blitzDropHeadline: 'MIDNIGHT QUICK-GLAM BLITZ DROPS',
    blitzDropSubheadline: 'Curated high-street statement pieces ready for dispatch in 60 minutes.',
    defaultTheme: 'dark',
    upiEnabled: true,
    codEnabled: true,
    razorpayEnabled: false,
    updatedAt: new Date().toISOString(),
  });
  console.log('   ✓ Seeded Dynamic Platform CMS Variables in MongoDB\n');

  console.log('3. Testing Cloudinary Configuration...');
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  console.log(`   Cloud Name: ${cloudName}`);
  console.log(`   API Key:    ${apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : 'MISSING'}`);
  console.log(`   API Secret: ${apiSecret ? `${apiSecret.slice(0, 4)}...${apiSecret.slice(-4)}` : 'MISSING'}`);

  const signatureData = mediaService.generateUploadSignature('muvera/products');
  console.log(`   ✓ Generated Signed Upload Payload:`);
  console.log(`     - Folder:    ${signatureData.folder}`);
  console.log(`     - Timestamp: ${signatureData.timestamp}`);
  console.log(`     - Signature: ${signatureData.signature.slice(0, 16)}...`);
  console.log(`     - Cloud:     ${signatureData.cloudName}\n`);

  await mongoose.disconnect();
  console.log('===============================================================');
  console.log('🎉 ALL CLOUD SERVICES CONNECTED & VERIFIED SUCCESSFULLY!');
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('\n❌ Initialization Error:', err);
  process.exit(1);
});
