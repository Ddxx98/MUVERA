import mongoose from 'mongoose';
import { Product, InventoryItem, StockMovement, OrderSnapshot, Coupon, ReturnRequest } from './types';

// Enforce reliable DNS resolvers on Windows Node environment to prevent querySrv ECONNREFUSED
if (typeof window === 'undefined') {
  try {
    const dns = require('dns');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Edge or browser environment
  }
}
import { initialProducts, initialInventory, initialOrders, initialCoupons } from './seed-data';
import { ProductModel, InventoryModel, StockMovementModel, OrderModel, CouponModel, UserModel, SiteSettingsModel, AuthTokenModel } from './models';
import { env } from '@/config/env';
import { UserRecord } from '@/modules/auth/types';
import { SiteSettingsData } from './models/SiteSettings';

export const initialSiteSettings: SiteSettingsData = {
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
};

export const initialUsers: UserRecord[] = [
  {
    id: 'user_admin_01',
    name: 'Executive Operations Admin',
    email: 'admin@muvera.club',
    phone: '9380933170',
    passwordHash: '7231b7c6b266d363073e1e2cb30aab08:b8c08a95857dd306d41d76b82269acb501859a770d4b470d250aa19eb41201bb063cf638ec06334f107b3af5f1abb952cc32265753888a6aaa11f2afa1963847',
    role: 'admin',
    loyaltyTier: 'VIP Gold',
    addresses: [
      {
        fullName: 'Admin Operations Hub',
        phone: '9380933170',
        street: '100 Feet Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        isDefault: true,
      },
    ],
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
    addresses: [
      {
        fullName: 'Rohan Verma',
        phone: '9916054321',
        street: '12th Main Road, HAL 2nd Stage, Indiranagar',
        apartment: 'Penthouse 4B',
        landmark: 'Near Toit Pub',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        isDefault: true,
      },
    ],
    createdAt: '2026-09-15T00:00:00.000Z',
  },
];

/**
 * Global singleton cache for Mongoose connection in Next.js Serverless.
 */
declare global {
  var _mongooseConn: Promise<typeof mongoose> | null | undefined;
  var _muveraDb: {
    products: Product[];
    inventory: InventoryItem[];
    stockMovements: StockMovement[];
    orders: OrderSnapshot[];
    coupons: Coupon[];
    returns: ReturnRequest[];
    users: UserRecord[];
    siteSettings: SiteSettingsData;
    authTokens: any[];
  } | undefined;
}

if (!global._muveraDb) {
  global._muveraDb = {
    products: [...initialProducts],
    inventory: [...initialInventory],
    stockMovements: [],
    orders: [...initialOrders],
    coupons: [...initialCoupons],
    returns: [],
    users: [...initialUsers],
    siteSettings: { ...initialSiteSettings },
    authTokens: [],
  };
}

async function connectToMongo(): Promise<boolean> {
  if (!env.mongoUri) return false;

  try {
    if (typeof window === 'undefined') {
      try {
        const dns = await import('dns');
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch {
        // Edge or browser environment
      }
    }

    if (!global._mongooseConn) {
      global._mongooseConn = mongoose.connect(env.mongoUri, {
        bufferCommands: false,
        maxPoolSize: 5,
      });
    }
    await global._mongooseConn;
    return true;
  } catch (err) {
    console.error('MongoDB connection error, falling back to local store:', err);
    return false;
  }
}

export const db = {
  // Products
  async getProducts(): Promise<Product[]> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const docs = await ProductModel.find().lean();
      if (docs.length > 0) {
        return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
      }
    }
    return global._muveraDb!.products;
  },

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await ProductModel.findOne({ slug }).lean();
      if (doc) return { ...(doc as any), id: (doc as any)._id.toString() };
    }
    return global._muveraDb!.products.find((p) => p.slug === slug);
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected && mongoose.isValidObjectId(id)) {
      const doc = await ProductModel.findById(id).lean();
      if (doc) return { ...(doc as any), id: (doc as any)._id.toString() };
    }
    return global._muveraDb!.products.find((p) => p.id === id);
  },

  async saveProduct(product: Product): Promise<Product> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      await ProductModel.findOneAndUpdate({ slug: product.slug }, product, { upsert: true, new: true });
    }

    const existingIndex = global._muveraDb!.products.findIndex((p) => p.id === product.id);
    if (existingIndex >= 0) {
      global._muveraDb!.products[existingIndex] = product;
    } else {
      global._muveraDb!.products.unshift(product);
    }
    return product;
  },

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const docs = await InventoryModel.find().lean();
      if (docs.length > 0) return docs as any;
    }
    return global._muveraDb!.inventory;
  },

  async getInventoryItem(variantId: string, locationId: string = 'loc_blr_ind_01'): Promise<InventoryItem | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await InventoryModel.findOne({ variantId, locationId }).lean();
      if (doc) return doc as any;
    }
    return global._muveraDb!.inventory.find(
      (item) => item.variantId === variantId && item.locationId === locationId
    );
  },

  async saveInventoryItem(item: InventoryItem): Promise<InventoryItem> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      await InventoryModel.findOneAndUpdate(
        { variantId: item.variantId, locationId: item.locationId },
        item,
        { upsert: true }
      );
    }

    const index = global._muveraDb!.inventory.findIndex(
      (i) => i.variantId === item.variantId && i.locationId === item.locationId
    );
    if (index >= 0) {
      global._muveraDb!.inventory[index] = item;
    } else {
      global._muveraDb!.inventory.push(item);
    }
    return item;
  },

  // Stock Movements
  async addStockMovement(movement: StockMovement): Promise<void> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      await StockMovementModel.create(movement);
    }
    global._muveraDb!.stockMovements.unshift(movement);
  },

  async getStockMovements(): Promise<StockMovement[]> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const docs = await StockMovementModel.find().sort({ createdAt: -1 }).limit(50).lean();
      if (docs.length > 0) return docs as any;
    }
    return global._muveraDb!.stockMovements;
  },

  // Orders
  async getOrders(): Promise<OrderSnapshot[]> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const docs = await OrderModel.find().sort({ createdAt: -1 }).lean();
      if (docs.length > 0) {
        return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
      }
    }
    return global._muveraDb!.orders;
  },

  async getOrderById(id: string): Promise<OrderSnapshot | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const query = mongoose.isValidObjectId(id) ? { _id: id } : { orderNo: id };
      const doc = await OrderModel.findOne(query).lean();
      if (doc) return { ...(doc as any), id: (doc as any)._id.toString() };
    }
    return global._muveraDb!.orders.find((o) => o.id === id || o.orderNo === id);
  },

  async saveOrder(order: OrderSnapshot): Promise<OrderSnapshot> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const savedDoc = await OrderModel.findOneAndUpdate({ orderNo: order.orderNo }, order, {
        upsert: true,
        new: true,
      });
      if (savedDoc) {
        order.id = savedDoc._id.toString();
      }
    }

    const index = global._muveraDb!.orders.findIndex((o) => o.id === order.id || o.orderNo === order.orderNo);
    if (index >= 0) {
      global._muveraDb!.orders[index] = order;
    } else {
      global._muveraDb!.orders.unshift(order);
    }
    return order;
  },

  // Coupons
  async getCoupons(): Promise<Coupon[]> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const docs = await CouponModel.find({ active: true }).lean();
      if (docs.length > 0) return docs as any;
    }
    return global._muveraDb!.coupons;
  },

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await CouponModel.findOne({ code: code.toUpperCase(), active: true }).lean();
      if (doc) return doc as any;
    }
    return global._muveraDb!.coupons.find((c) => c.code.toUpperCase() === code.toUpperCase() && c.active);
  },

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      await CouponModel.findOneAndUpdate({ code: coupon.code.toUpperCase() }, coupon, { upsert: true });
    }

    const index = global._muveraDb!.coupons.findIndex((c) => c.code.toUpperCase() === coupon.code.toUpperCase());
    if (index >= 0) {
      global._muveraDb!.coupons[index] = coupon;
    } else {
      global._muveraDb!.coupons.push(coupon);
    }
    return coupon;
  },

  // Returns
  async getReturns(): Promise<ReturnRequest[]> {
    return global._muveraDb!.returns;
  },

  async saveReturn(returnReq: ReturnRequest): Promise<ReturnRequest> {
    const index = global._muveraDb!.returns.findIndex((r) => r.id === returnReq.id);
    if (index >= 0) {
      global._muveraDb!.returns[index] = returnReq;
    } else {
      global._muveraDb!.returns.unshift(returnReq);
    }
    return returnReq;
  },

  // Users
  async getUsers(): Promise<UserRecord[]> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const docs = await UserModel.find().lean();
      if (docs.length > 0) {
        return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
      }
    }
    return global._muveraDb!.users;
  },

  async getUserByEmail(email: string): Promise<UserRecord | undefined> {
    const cleanEmail = email.toLowerCase().trim();
    const isConnected = await connectToMongo();
    if (isConnected) {
      // Atlas is source of truth — don't fall back to in-memory when connected
      const doc = await UserModel.findOne({ email: cleanEmail }).lean();
      return doc ? { ...(doc as any), id: (doc as any)._id.toString() } : undefined;
    }
    return global._muveraDb!.users.find((u) => u.email.toLowerCase() === cleanEmail);
  },

  async getUserByPhone(phone: string): Promise<UserRecord | undefined> {
    const cleanPhone = phone.replace(/\D/g, '');
    const isConnected = await connectToMongo();
    if (isConnected) {
      // Atlas is source of truth — don't fall back to in-memory when connected
      const doc = await UserModel.findOne({ phone: cleanPhone }).lean();
      return doc ? { ...(doc as any), id: (doc as any)._id.toString() } : undefined;
    }
    return global._muveraDb!.users.find((u) => u.phone.replace(/\D/g, '') === cleanPhone);
  },

  async getUserById(id: string): Promise<UserRecord | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      if (mongoose.isValidObjectId(id)) {
        const doc = await UserModel.findById(id).lean();
        return doc ? { ...(doc as any), id: (doc as any)._id.toString() } : undefined;
      }
      return undefined; // Atlas is connected but id is not a valid ObjectId
    }
    return global._muveraDb!.users.find((u) => u.id === id);
  },

  async saveUser(user: UserRecord): Promise<UserRecord> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      // Use $set to avoid Mongoose trying to write the custom `id` string field as `_id`
      const { id: _ignored, ...mongoFields } = user;
      const savedDoc = await UserModel.findOneAndUpdate(
        { email: user.email.toLowerCase() },
        { $set: mongoFields },
        { upsert: true, returnDocument: 'after' }
      );
      if (savedDoc) {
        user.id = savedDoc._id.toString();
      }
    }

    const index = global._muveraDb!.users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (index >= 0) {
      global._muveraDb!.users[index] = user;
    } else {
      global._muveraDb!.users.unshift(user);
    }
    return user;
  },

  async updateUserPassword(userIdOrEmail: string, newPasswordHash: string): Promise<boolean> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      if (mongoose.isValidObjectId(userIdOrEmail)) {
        await UserModel.findByIdAndUpdate(userIdOrEmail, { $set: { passwordHash: newPasswordHash } });
      } else {
        await UserModel.updateOne(
          { $or: [{ email: userIdOrEmail.toLowerCase() }, { _id: userIdOrEmail }] },
          { $set: { passwordHash: newPasswordHash } }
        );
      }
    }

    const user = global._muveraDb!.users.find(
      (u) => u.id === userIdOrEmail || u.email.toLowerCase() === userIdOrEmail.toLowerCase()
    );
    if (user) {
      user.passwordHash = newPasswordHash;
      return true;
    }
    return false;
  },

  // Site Settings (Singleton)
  async getSiteSettings(): Promise<SiteSettingsData> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await SiteSettingsModel.findOne().lean();
      if (doc) return doc as any;
    }
    return global._muveraDb!.siteSettings;
  },

  async saveSiteSettings(settings: Partial<SiteSettingsData>, actor = 'Admin'): Promise<SiteSettingsData> {
    const updated = {
      ...global._muveraDb!.siteSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };

    const isConnected = await connectToMongo();
    if (isConnected) {
      await SiteSettingsModel.findOneAndUpdate({}, updated, { upsert: true, new: true });
    }

    global._muveraDb!.siteSettings = updated;
    return updated;
  },

  // Auth Tokens (Email verification & Password Reset conforming to Section 23)
  async createAuthToken(token: {
    userId: string;
    email: string;
    type: 'email_verify' | 'password_reset';
    tokenHash: string;
    expiresAt: Date;
    requestIp?: string;
    userAgent?: string;
  }) {
    const isConnected = await connectToMongo();
    if (isConnected) {
      await AuthTokenModel.findOneAndUpdate({ tokenHash: token.tokenHash }, token, { upsert: true });
    }
    global._muveraDb!.authTokens.push({
      ...token,
      usedAt: null,
      createdAt: new Date(),
    });
  },

  async findValidAuthToken(tokenHash: string, type: 'email_verify' | 'password_reset') {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await AuthTokenModel.findOne({
        tokenHash,
        type,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      }).lean();
      if (doc) return doc;
    }
    const now = Date.now();
    return global._muveraDb!.authTokens.find(
      (t) =>
        t.tokenHash === tokenHash &&
        t.type === type &&
        t.usedAt === null &&
        new Date(t.expiresAt).getTime() > now
    );
  },

  async consumeAuthToken(tokenHash: string, type: 'email_verify' | 'password_reset') {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await AuthTokenModel.findOneAndUpdate(
        {
          tokenHash,
          type,
          usedAt: null,
          expiresAt: { $gt: new Date() },
        },
        { $set: { usedAt: new Date() } },
        { new: true }
      ).lean();
      if (doc) return doc;
    }

    const now = Date.now();
    const token = global._muveraDb!.authTokens.find(
      (t) =>
        t.tokenHash === tokenHash &&
        t.type === type &&
        t.usedAt === null &&
        new Date(t.expiresAt).getTime() > now
    );
    if (!token) return null;
    token.usedAt = new Date();
    return token;
  },

  async invalidateUserTokens(userId: string, type: 'email_verify' | 'password_reset') {
    const isConnected = await connectToMongo();
    if (isConnected) {
      await AuthTokenModel.updateMany(
        { userId, type, usedAt: null },
        { $set: { usedAt: new Date() } }
      );
    }
    for (const t of global._muveraDb!.authTokens) {
      if (t.userId === userId && t.type === type && t.usedAt === null) {
        t.usedAt = new Date();
      }
    }
  },
};
