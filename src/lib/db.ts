import mongoose from 'mongoose';
import { Product, InventoryItem, StockMovement, OrderSnapshot, Coupon, ReturnRequest, Category } from './types';
import { siteConfig } from '@/config/site';
import { initialProducts, initialInventory, initialOrders, initialCoupons } from './seed-data';
import { ProductModel, InventoryModel, StockMovementModel, OrderModel, CouponModel, UserModel, SiteSettingsModel, AuthTokenModel, ReturnModel, CategoryModel } from './models';
import { env } from '@/config/env';
import { UserRecord } from '@/modules/auth/types';
import { SiteSettingsData } from './models/SiteSettings';

export const initialSiteSettings: SiteSettingsData = {
  businessName: 'MUVERA Luxury Streetwear',
  tagline: 'Luxury Fashion & Streetwear Commerce',
  supportEmail: 'support@muvera.club',
  supportPhone: '+91 93809 33170',
  whatsappNumber: '919380933170',
  freeShippingThresholdPaise: 99900,
  expressDeliveryFeePaise: 9900,
  holdExpiryMinutes: 15,
  returnWindowDays: 7,
  defaultLocationName: 'Indiranagar Dark Store Hub (Bengaluru)',
  defaultLocationPincode: '560038',
  businessUpiId: 'muvera.store@upi',
  businessUpiMerchantName: 'MUVERA Luxury Streetwear',
  topAnnouncementText: '⚡ FAST DISPATCH • Free Express Shipping above ₹999',
  topAnnouncementActive: true,
  blitzDropHeadline: 'MIDNIGHT QUICK-GLAM BLITZ DROPS',
  blitzDropSubheadline: 'Curated high-street statement pieces ready for express dispatch.',
  defaultTheme: 'dark',
  upiEnabled: true,
  codEnabled: true,
  enableCod: true,
  razorpayEnabled: false,
  heroActive: true,
  heroBackgroundImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&auto=format&fit=crop&q=80',
  heroTagBadge: 'Blitz Drop 04',
  heroSecondaryBadge: 'Try & Buy Available',
  heroEyebrow: 'Instant Nightlife Glamour',
  heroTitleLine1: 'PARTY TONIGHT?',
  heroTitleLine2: 'EXPRESS STREETWEAR',
  heroSubtitle: 'Curated luxury streetwear, statement drops & limited club editions delivered with express speed.',
  heroCtaText: 'Explore Drops',
  heroCtaLink: '/products',
  heroDeliveryTicker: 'Dispatches today',
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
    categories: Category[];
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
    categories: siteConfig.categories.map((c, i) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      count: c.count,
      order: i,
    })),
  };
}

export async function connectToMongo(): Promise<boolean> {
  const uri = process.env.MONGODB_URI || env.mongoUri;
  if (!uri) return false;

  try {
    if ((mongoose.connection.readyState as number) === 1) return true;

    // Reset cached connection if disconnected (state 0) or uninitialized
    if (!global._mongooseConn || (mongoose.connection.readyState as number) === 0) {
      global._mongooseConn = mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
      });
    }
    await global._mongooseConn;
    return (mongoose.connection.readyState as number) === 1;
  } catch (err: any) {
    // If local network DNS refuses MongoDB SRV queries (common on Windows home Wi-Fi), retry with standard DNS
    if (typeof window === 'undefined' && (err?.code === 'ECONNREFUSED' || err?.syscall === 'querySrv')) {
      try {
        const dns = await import('dns');
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        global._mongooseConn = mongoose.connect(uri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 8000,
        });
        await global._mongooseConn;
        return (mongoose.connection.readyState as number) === 1;
      } catch (retryErr) {
        console.error('MongoDB retry with public DNS failed:', retryErr);
      }
    }
    global._mongooseConn = null;
    console.error('MongoDB connection error, falling back to local store:', err);
    return false;
  }
}

function normalizeProduct(doc: any): Product {
  if (!doc) return doc;
  const id = doc.id || doc._id?.toString();
  const variants = Array.isArray(doc.variants)
    ? doc.variants.map((v: any) => ({
        ...v,
        id: v.id || v._id?.toString() || `${doc.slug || id}_${v.size}_${v.sku || 'std'}`,
      }))
    : [];
  return {
    ...doc,
    id,
    variants,
  };
}

export interface ProductQueryOptions {
  categoryId?: string;
  category?: string;
  categorySlug?: string;
  brand?: string;
  brandSlug?: string;
  search?: string;
  isBlitzDrop?: boolean;
  isDealOfTheHour?: boolean;
  minPricePaise?: number;
  maxPricePaise?: number;
  tags?: string[];
  limit?: number;
  skip?: number;
  projection?: string | Record<string, number>;
}

export interface OrderQueryOptions {
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  fulfilmentStatus?: string;
  paymentStatus?: string;
  orderStatus?: string;
  limit?: number;
  skip?: number;
}

// In-memory cache for fast user session lookups (TTL: 30 seconds)
const _userSessionCache = new Map<string, { user: UserRecord; expires: number }>();

function getCachedUser(idOrEmail: string): UserRecord | undefined {
  const item = _userSessionCache.get(idOrEmail.toLowerCase().trim());
  if (item && item.expires > Date.now()) {
    return item.user;
  }
  if (item) {
    _userSessionCache.delete(idOrEmail.toLowerCase().trim());
  }
  return undefined;
}

function setCachedUser(user: UserRecord): void {
  const expires = Date.now() + 30 * 1000;
  if (user.id) _userSessionCache.set(user.id.toLowerCase().trim(), { user, expires });
  if (user.email) _userSessionCache.set(user.email.toLowerCase().trim(), { user, expires });
}

export function invalidateUserCache(idOrEmail?: string): void {
  if (!idOrEmail) {
    _userSessionCache.clear();
    return;
  }
  const clean = idOrEmail.toLowerCase().trim();
  _userSessionCache.forEach((entry, key) => {
    if (key === clean || entry.user.id?.toLowerCase() === clean || entry.user.email?.toLowerCase() === clean) {
      _userSessionCache.delete(key);
    }
  });
}

// In-memory cache for site settings and categories (TTL: 60 seconds)
let _cachedSettings: { data: SiteSettingsData; expires: number } | null = null;
let _cachedCategories: { data: Category[]; expires: number } | null = null;

export const db = {
  // Products
  async getProducts(options?: ProductQueryOptions): Promise<Product[]> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const query: any = {};
      if (options?.categoryId) {
        query.categoryId = options.categoryId;
      }
      if (options?.category && options.category !== 'all') {
        const cat = options.category.toLowerCase().trim();
        query.$or = [{ categorySlug: cat }, { category: new RegExp(`^${cat}$`, 'i') }];
      }
      if (options?.categorySlug && options.categorySlug !== 'all') {
        query.categorySlug = options.categorySlug.toLowerCase().trim();
      }
      if (options?.brand && options.brand !== 'all') {
        const br = options.brand.toLowerCase().trim();
        query.$or = [{ brandSlug: br }, { brand: new RegExp(`^${br}$`, 'i') }];
      }
      if (options?.brandSlug && options.brandSlug !== 'all') {
        query.brandSlug = options.brandSlug.toLowerCase().trim();
      }
      if (options?.isBlitzDrop !== undefined) {
        query.isBlitzDrop = options.isBlitzDrop;
      }
      if (options?.isDealOfTheHour !== undefined) {
        query.isDealOfTheHour = options.isDealOfTheHour;
      }
      if (options?.minPricePaise !== undefined || options?.maxPricePaise !== undefined) {
        query.sellingPricePaise = {};
        if (options.minPricePaise !== undefined) query.sellingPricePaise.$gte = options.minPricePaise;
        if (options.maxPricePaise !== undefined) query.sellingPricePaise.$lte = options.maxPricePaise;
      }
      if (options?.tags && options.tags.length > 0) {
        query.tags = { $in: options.tags };
      }
      if (options?.search) {
        const q = options.search.trim();
        const searchRegex = new RegExp(q, 'i');
        query.$or = [
          { title: searchRegex },
          { brand: searchRegex },
          { category: searchRegex },
          { tags: { $in: [searchRegex] } },
        ];
      }

      let mQuery = ProductModel.find(query).sort({ createdAt: -1 });
      if (options?.projection) {
        mQuery = mQuery.select(options.projection);
      }
      if (options?.skip) {
        mQuery = mQuery.skip(options.skip);
      }
      if (options?.limit) {
        mQuery = mQuery.limit(options.limit);
      }

      const docs = await mQuery.lean();
      return docs.map(normalizeProduct);
    }

    let items = global._muveraDb!.products;
    if (options?.categoryId) {
      items = items.filter((p) => p.categoryId === options.categoryId);
    }
    if (options?.category && options.category !== 'all') {
      const c = options.category.toLowerCase().trim();
      items = items.filter((p) => p.category.toLowerCase() === c || p.categorySlug?.toLowerCase() === c);
    }
    if (options?.brand && options.brand !== 'all') {
      const b = options.brand.toLowerCase().trim();
      items = items.filter((p) => p.brand.toLowerCase() === b || p.brandSlug?.toLowerCase() === b);
    }
    if (options?.isBlitzDrop !== undefined) {
      items = items.filter((p) => Boolean(p.isBlitzDrop) === options.isBlitzDrop);
    }
    if (options?.isDealOfTheHour !== undefined) {
      items = items.filter((p) => Boolean(p.isDealOfTheHour) === options.isDealOfTheHour);
    }
    if (options?.minPricePaise !== undefined) {
      items = items.filter((p) => p.sellingPricePaise >= options.minPricePaise!);
    }
    if (options?.maxPricePaise !== undefined) {
      items = items.filter((p) => p.sellingPricePaise <= options.maxPricePaise!);
    }
    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (options?.skip) {
      items = items.slice(options.skip);
    }
    if (options?.limit) {
      items = items.slice(0, options.limit);
    }
    return items.map(normalizeProduct);
  },

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await ProductModel.findOne({ slug }).lean();
      return doc ? normalizeProduct(doc) : undefined;
    }
    const found = global._muveraDb!.products.find((p) => p.slug === slug);
    return found ? normalizeProduct(found) : undefined;
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const query: any = mongoose.isValidObjectId(id)
        ? { $or: [{ _id: id }, { id }, { slug: id }] }
        : { $or: [{ id }, { slug: id }] };
      const doc = await ProductModel.findOne(query).lean();
      return doc ? normalizeProduct(doc) : undefined;
    }
    const found = global._muveraDb!.products.find((p) => p.id === id || p.slug === id);
    return found ? normalizeProduct(found) : undefined;
  },

  async saveProduct(product: Product): Promise<Product> {
    const isConnected = await connectToMongo();
    let savedProduct = product;
    if (isConnected) {
      let doc: any = null;
      if (product.id && mongoose.isValidObjectId(product.id)) {
        doc = await ProductModel.findByIdAndUpdate(product.id, product, { upsert: true, new: true }).lean();
      } else {
        doc = await ProductModel.findOneAndUpdate({ slug: product.slug }, product, { upsert: true, new: true }).lean();
      }
      if (doc) {
        savedProduct = normalizeProduct(doc);
      }
    }

    const existingIndex = global._muveraDb!.products.findIndex((p) => p.id === savedProduct.id || p.slug === savedProduct.slug);
    if (existingIndex >= 0) {
      global._muveraDb!.products[existingIndex] = savedProduct;
    } else {
      global._muveraDb!.products.unshift(savedProduct);
    }
    return savedProduct;
  },

  async deleteProduct(idOrSlug: string): Promise<boolean> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      let productDoc: any = null;
      if (mongoose.isValidObjectId(idOrSlug)) {
        productDoc = await ProductModel.findByIdAndDelete(idOrSlug);
      } else {
        productDoc = await ProductModel.findOneAndDelete({ slug: idOrSlug });
      }

      // Also clean up any associated inventory units
      if (productDoc && Array.isArray(productDoc.variants)) {
        const variantIds = productDoc.variants.map((v: any) => v._id?.toString() || v.id);
        const skus = productDoc.variants.map((v: any) => v.sku);
        await InventoryModel.deleteMany({
          $or: [{ variantId: { $in: variantIds } }, { sku: { $in: skus } }],
        });
      }
    }

    const idx = global._muveraDb!.products.findIndex((p) => p.id === idOrSlug || p.slug === idOrSlug);
    if (idx >= 0) {
      global._muveraDb!.products.splice(idx, 1);
    }
    return true;
  },

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const docs = await InventoryModel.find().lean();
      return docs as any;
    }
    return global._muveraDb!.inventory;
  },

  async getInventoryItem(variantId: string, locationId: string = 'loc_blr_ind_01'): Promise<InventoryItem | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await InventoryModel.findOne({ variantId, locationId }).lean();
      return doc ? (doc as any) : undefined;
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
      return docs as any;
    }
    return global._muveraDb!.stockMovements;
  },

  // Orders
  async getOrders(options?: OrderQueryOptions): Promise<OrderSnapshot[]> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const query: any = {};
      const cleanEmail = options?.customerEmail?.toLowerCase().trim();
      const cleanPhone = options?.customerPhone?.replace(/\D/g, '').slice(-10);

      if (options?.customerId) {
        if (cleanEmail || cleanPhone) {
          query.$or = [
            { customerId: options.customerId },
            ...(cleanEmail ? [{ customerEmail: cleanEmail }] : []),
            ...(cleanPhone ? [{ customerPhone: cleanPhone }, { customerPhone: options?.customerPhone?.trim() }] : []),
          ];
        } else {
          query.customerId = options.customerId;
        }
      } else if (cleanEmail && cleanPhone) {
        query.$or = [
          { customerEmail: cleanEmail },
          { customerPhone: options?.customerPhone?.trim() },
          { customerPhone: cleanPhone },
          { customerPhone: new RegExp(`${cleanPhone}$`) },
        ];
      } else if (cleanEmail) {
        query.customerEmail = cleanEmail;
      } else if (cleanPhone) {
        query.$or = [
          { customerPhone: options?.customerPhone?.trim() },
          { customerPhone: cleanPhone },
          { customerPhone: new RegExp(`${cleanPhone}$`) },
        ];
      }

      if (options?.fulfilmentStatus) query.fulfilmentStatus = options.fulfilmentStatus;
      if (options?.paymentStatus) query.paymentStatus = options.paymentStatus;
      if (options?.orderStatus) query.orderStatus = options.orderStatus;

      let mQuery = OrderModel.find(query).sort({ createdAt: -1 });
      if (options?.skip) mQuery = mQuery.skip(options.skip);
      if (options?.limit) mQuery = mQuery.limit(options.limit);

      const docs = await mQuery.lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }

    let items = global._muveraDb!.orders;
    if (options?.customerId) {
      items = items.filter((o) => o.customerId === options.customerId);
    } else if (options?.customerEmail || options?.customerPhone) {
      const cleanEmail = options?.customerEmail?.toLowerCase().trim();
      const cleanPhone = options?.customerPhone?.replace(/\D/g, '').slice(-10);
      items = items.filter((o) => {
        const orderEmail = (o.customerEmail || '').toLowerCase().trim();
        const orderPhone = (o.customerPhone || '').replace(/\D/g, '').slice(-10);
        const emailMatch = Boolean(cleanEmail && orderEmail && cleanEmail === orderEmail);
        const phoneMatch = Boolean(cleanPhone && orderPhone && cleanPhone === orderPhone);
        return emailMatch || phoneMatch;
      });
    }
    if (options?.fulfilmentStatus) {
      items = items.filter((o) => o.fulfilmentStatus === options.fulfilmentStatus);
    }
    if (options?.paymentStatus) {
      items = items.filter((o) => o.paymentStatus === options.paymentStatus);
    }
    if (options?.orderStatus) {
      items = items.filter((o) => o.orderStatus === options.orderStatus);
    }
    if (options?.skip) items = items.slice(options.skip);
    if (options?.limit) items = items.slice(0, options.limit);
    return items;
  },

  async getOrderById(id: string): Promise<OrderSnapshot | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const query: any = mongoose.isValidObjectId(id)
        ? { $or: [{ _id: id }, { orderNo: id }, { id: id }, { orderId: id }] }
        : { $or: [{ orderNo: id }, { id: id }, { orderId: id }] };
      const doc = await OrderModel.findOne(query).lean();
      if (doc) return { ...(doc as any), id: (doc as any)._id.toString() };
    }
    return global._muveraDb!.orders.find((o) => o.id === id || o.orderNo === id);
  },

  async saveOrder(order: OrderSnapshot): Promise<OrderSnapshot> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const payloadToSave = {
        ...order,
        id: order.id,
        orderId: order.id,
        customerId: order.customerId,
      };
      const savedDoc = await OrderModel.findOneAndUpdate({ orderNo: order.orderNo }, payloadToSave, {
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
      const docs = await CouponModel.find().sort({ createdAt: -1 }).lean();
      return docs as any;
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
  async getReturns(options?: { customerId?: string; orderId?: string; limit?: number }): Promise<ReturnRequest[]> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const query: Record<string, any> = {};
      if (options?.customerId) {
        query.customerId = options.customerId;
      }
      if (options?.orderId) {
        query.orderId = options.orderId;
      }
      const mongoQuery = ReturnModel.find(query).sort({ createdAt: -1 });
      if (options?.limit && options.limit > 0) {
        mongoQuery.limit(options.limit);
      }
      const docs = await mongoQuery.lean();
      return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    }
    let list = global._muveraDb!.returns;
    if (options?.customerId) {
      list = list.filter((r) => r.customerId === options.customerId);
    }
    if (options?.orderId) {
      list = list.filter((r) => r.orderId === options.orderId);
    }
    if (options?.limit && options.limit > 0) {
      list = list.slice(0, options.limit);
    }
    return list;
  },

  async getReturnById(id: string): Promise<ReturnRequest | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const query: any = mongoose.isValidObjectId(id)
        ? { $or: [{ _id: id }, { returnNo: id }, { id: id }] }
        : { $or: [{ returnNo: id }, { id: id }] };
      const doc = await ReturnModel.findOne(query).lean();
      if (doc) return { ...(doc as any), id: (doc as any)._id.toString() };
    }
    return global._muveraDb!.returns.find((r) => r.id === id || r.returnNo === id);
  },

  async saveReturn(returnReq: ReturnRequest): Promise<ReturnRequest> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const payload = {
        ...returnReq,
        customerId: returnReq.customerId,
      };
      const savedDoc = await ReturnModel.findOneAndUpdate(
        { returnNo: returnReq.returnNo },
        payload,
        { upsert: true, new: true }
      );
      if (savedDoc) {
        returnReq.id = savedDoc._id.toString();
      }
    }

    const index = global._muveraDb!.returns.findIndex((r) => r.id === returnReq.id || r.returnNo === returnReq.returnNo);
    if (index >= 0) {
      global._muveraDb!.returns[index] = returnReq;
    } else {
      global._muveraDb!.returns.unshift(returnReq);
    }
    return returnReq;
  },

  async updateReturnStatus(
    id: string,
    status: ReturnRequest['status'],
    inspectionDecision?: 'restock' | 'damaged_write_off'
  ): Promise<ReturnRequest | null> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const query = mongoose.isValidObjectId(id) ? { _id: id } : { returnNo: id };
      const updateData: any = { status };
      if (inspectionDecision) {
        updateData['items.0.inspectionDecision'] = inspectionDecision;
      }
      const doc = await ReturnModel.findOneAndUpdate(query, { $set: updateData }, { new: true }).lean();
      if (doc) return { ...(doc as any), id: (doc as any)._id.toString() };
    }
    const target = global._muveraDb!.returns.find((r) => r.id === id || r.returnNo === id);
    if (target) {
      target.status = status;
      return target;
    }
    return null;
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
    const cached = getCachedUser(cleanEmail);
    if (cached) return cached;

    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await UserModel.findOne({ email: cleanEmail }).lean();
      if (doc) {
        const u = { ...(doc as any), id: (doc as any)._id.toString() };
        setCachedUser(u);
        return u;
      }
    }
    const found = global._muveraDb!.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (found) setCachedUser(found);
    return found;
  },

  async getUserByPhone(phone: string): Promise<UserRecord | undefined> {
    const cleanPhone = phone.replace(/\D/g, '');
    const clean10 = cleanPhone.slice(-10);
    const cached = getCachedUser(clean10);
    if (cached) return cached;

    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await UserModel.findOne({
        $or: [
          { phone: cleanPhone },
          { phone: clean10 },
          { phone: new RegExp(`${clean10}$`) },
        ],
      }).lean();
      if (doc) {
        const u = { ...(doc as any), id: (doc as any)._id.toString() };
        setCachedUser(u);
        return u;
      }
    }
    const found = global._muveraDb!.users.find(
      (u) => u.phone.replace(/\D/g, '').slice(-10) === clean10
    );
    if (found) setCachedUser(found);
    return found;
  },

  async getUserByEmailOrPhone(email: string, phone: string): Promise<UserRecord | undefined> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cachedEmail = getCachedUser(cleanEmail);
    if (cachedEmail) return cachedEmail;
    const cachedPhone = getCachedUser(cleanPhone);
    if (cachedPhone) return cachedPhone;

    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await UserModel.findOne({
        $or: [
          { email: cleanEmail },
          { phone: phone.trim() },
          { phone: cleanPhone },
          { phone: new RegExp(`${cleanPhone}$`) },
        ],
      }).lean();
      if (doc) {
        const u = { ...(doc as any), id: (doc as any)._id.toString() };
        setCachedUser(u);
        return u;
      }
    }
    const found = global._muveraDb!.users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        u.phone.replace(/\D/g, '').slice(-10) === cleanPhone
    );
    if (found) setCachedUser(found);
    return found;
  },

  async getUserById(id: string): Promise<UserRecord | undefined> {
    const cached = getCachedUser(id);
    if (cached) return cached;

    const isConnected = await connectToMongo();
    if (isConnected) {
      if (mongoose.isValidObjectId(id)) {
        const doc = await UserModel.findById(id).lean();
        if (doc) {
          const u = { ...(doc as any), id: (doc as any)._id.toString() };
          setCachedUser(u);
          return u;
        }
      } else {
        const doc = await UserModel.findOne({ $or: [{ id }, { email: id.toLowerCase() }] }).lean();
        if (doc) {
          const u = { ...(doc as any), id: (doc as any)._id.toString() };
          setCachedUser(u);
          return u;
        }
      }
    }
    const found = global._muveraDb!.users.find((u) => u.id === id);
    if (found) setCachedUser(found);
    return found;
  },

  async saveUser(user: UserRecord): Promise<UserRecord> {
    invalidateUserCache(user.id);
    invalidateUserCache(user.email);
    invalidateUserCache(user.phone);

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
    setCachedUser(user);
    return user;
  },

  async updateUserPassword(userIdOrEmail: string, newPasswordHash: string): Promise<boolean> {
    invalidateUserCache(userIdOrEmail);
    const isConnected = await connectToMongo();
    if (isConnected) {
      const isObjectId = mongoose.isValidObjectId(userIdOrEmail);
      const query = isObjectId
        ? { $or: [{ _id: userIdOrEmail }, { email: userIdOrEmail.toLowerCase() }] }
        : { email: userIdOrEmail.toLowerCase() };

      await UserModel.updateOne(query, { $set: { passwordHash: newPasswordHash } });
    }

    const user = global._muveraDb!.users.find(
      (u) => u.id === userIdOrEmail || u.email.toLowerCase() === userIdOrEmail.toLowerCase()
    );
    if (user) {
      user.passwordHash = newPasswordHash;
      invalidateUserCache(user.id);
      invalidateUserCache(user.email);
      return true;
    }
    return false;
  },

  async setUserEmailVerified(userIdOrEmail: string, verified = true): Promise<boolean> {
    invalidateUserCache(userIdOrEmail);
    const isConnected = await connectToMongo();
    if (isConnected) {
      const isObjectId = mongoose.isValidObjectId(userIdOrEmail);
      const query = isObjectId
        ? { $or: [{ _id: userIdOrEmail }, { email: userIdOrEmail.toLowerCase() }] }
        : { email: userIdOrEmail.toLowerCase() };

      await UserModel.updateOne(query, { $set: { emailVerified: verified } });
    }

    const user = global._muveraDb!.users.find(
      (u) => u.id === userIdOrEmail || u.email.toLowerCase() === userIdOrEmail.toLowerCase()
    );
    if (user) {
      user.emailVerified = verified;
      invalidateUserCache(user.id);
      invalidateUserCache(user.email);
      return true;
    }
    return true;
  },

  // Site Settings (Singleton with 60s in-memory TTL cache)
  async getSiteSettings(): Promise<SiteSettingsData> {
    if (_cachedSettings && _cachedSettings.expires > Date.now()) {
      return _cachedSettings.data;
    }
    try {
      const isConnected = await connectToMongo();
      if (isConnected && mongoose.connection.readyState === 1) {
        const doc = await SiteSettingsModel.findOne().lean();
        if (doc) {
          _cachedSettings = { data: doc as any, expires: Date.now() + 60 * 1000 };
          return doc as any;
        }
      }
    } catch (err) {
      console.warn('Error fetching site settings from Mongo, using in-memory store:', err);
    }
    _cachedSettings = { data: global._muveraDb!.siteSettings, expires: Date.now() + 60 * 1000 };
    return global._muveraDb!.siteSettings;
  },

  async saveSiteSettings(settings: Partial<SiteSettingsData>, actor = 'Admin'): Promise<SiteSettingsData> {
    _cachedSettings = null; // Invalidate cache
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
    _cachedSettings = { data: updated, expires: Date.now() + 60 * 1000 };
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

  async invalidateUserTokens(userIdOrEmail: string, type: 'email_verify' | 'password_reset') {
    const isConnected = await connectToMongo();
    if (isConnected) {
      await AuthTokenModel.updateMany(
        { $or: [{ userId: userIdOrEmail }, { email: userIdOrEmail.toLowerCase() }], type, usedAt: null },
        { $set: { usedAt: new Date() } }
      );
    }
    for (const t of global._muveraDb!.authTokens) {
      if ((t.userId === userIdOrEmail || t.email.toLowerCase() === userIdOrEmail.toLowerCase()) && t.type === type && t.usedAt === null) {
        t.usedAt = new Date();
      }
    }
  },

  // Categories (with 60s in-memory TTL cache)
  async getCategories(): Promise<Category[]> {
    if (_cachedCategories && _cachedCategories.expires > Date.now()) {
      return _cachedCategories.data;
    }

    const isConnected = await connectToMongo();
    if (isConnected) {
      let docs = await CategoryModel.find().sort({ order: 1, createdAt: 1 }).lean();
      if (!docs || docs.length === 0) {
        try {
          // Pre-populate default luxury apparel categories into Atlas idempotently
          const bulkOps = siteConfig.categories.map((c, i) => ({
            updateOne: {
              filter: { slug: c.slug },
              update: {
                $setOnInsert: {
                  name: c.name,
                  slug: c.slug,
                  image: c.image,
                  order: i,
                  createdAt: new Date().toISOString(),
                },
              },
              upsert: true,
            },
          }));
          await CategoryModel.bulkWrite(bulkOps, { ordered: false });
        } catch {
          // Ignore concurrent race condition if another worker seeded simultaneously
        }
        docs = await CategoryModel.find().sort({ order: 1, createdAt: 1 }).lean();
      }

      // Count products per category
      const products = await ProductModel.find().select('category categorySlug').lean();

      const result = docs.map((d: any) => {
        const catCount = products.filter(
          (p: any) =>
            p.categorySlug === d.slug ||
            (p.category && p.category.toLowerCase() === d.name.toLowerCase())
        ).length;

        return {
          id: d._id.toString(),
          name: d.name,
          slug: d.slug,
          image: d.image || siteConfig.categories.find((sc) => sc.slug === d.slug)?.image || '',
          description: d.description || '',
          count: catCount,
          order: d.order,
          createdAt: d.createdAt,
        };
      });

      _cachedCategories = { data: result, expires: Date.now() + 60 * 1000 };
      return result;
    }

    const fallback = global._muveraDb?.categories || siteConfig.categories.map((c, i) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      count: c.count,
      order: i,
    }));
    _cachedCategories = { data: fallback, expires: Date.now() + 60 * 1000 };
    return fallback;
  },

  async getCategoryById(id: string): Promise<Category | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const query: any = mongoose.isValidObjectId(id) ? { _id: id } : { slug: id };
      const doc = await CategoryModel.findOne(query).lean();
      if (doc) {
        return {
          id: (doc as any)._id.toString(),
          name: (doc as any).name,
          slug: (doc as any).slug,
          image: (doc as any).image,
          description: (doc as any).description,
          order: (doc as any).order,
        };
      }
    }
    return (global._muveraDb?.categories || siteConfig.categories).find((c) => c.id === id || c.slug === id);
  },

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      const doc = await CategoryModel.findOne({ slug }).lean();
      if (doc) {
        return {
          id: (doc as any)._id.toString(),
          name: (doc as any).name,
          slug: (doc as any).slug,
          image: (doc as any).image,
          description: (doc as any).description,
          order: (doc as any).order,
        };
      }
    }
    return (global._muveraDb?.categories || siteConfig.categories).find((c) => c.slug === slug);
  },

  async saveCategory(category: {
    id?: string;
    name: string;
    slug?: string;
    image?: string;
    description?: string;
    order?: number;
  }): Promise<Category> {
    _cachedCategories = null; // Invalidate cache
    const isConnected = await connectToMongo();
    const slug = (category.slug || category.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const payload = {
      name: category.name.trim(),
      slug,
      image: category.image || '',
      description: category.description || '',
      order: typeof category.order === 'number' ? category.order : 0,
      updatedAt: new Date().toISOString(),
    };

    if (isConnected) {
      let doc: any;
      if (category.id && mongoose.isValidObjectId(category.id)) {
        doc = await CategoryModel.findByIdAndUpdate(category.id, payload, { new: true, upsert: true }).lean();
      } else {
        doc = await CategoryModel.findOneAndUpdate({ slug }, payload, { new: true, upsert: true }).lean();
      }
      return {
        id: (doc as any)._id.toString(),
        name: (doc as any).name,
        slug: (doc as any).slug,
        image: (doc as any).image,
        description: (doc as any).description,
        order: (doc as any).order,
      };
    }

    const newCat: Category = {
      id: category.id || `cat_${Date.now()}`,
      ...payload,
      count: 0,
    };
    if (global._muveraDb) {
      const idx = global._muveraDb.categories.findIndex((c) => c.slug === slug || c.id === category.id);
      if (idx >= 0) {
        global._muveraDb.categories[idx] = newCat;
      } else {
        global._muveraDb.categories.push(newCat);
      }
    }
    return newCat;
  },

  async deleteCategory(idOrSlug: string): Promise<boolean> {
    const isConnected = await connectToMongo();
    if (isConnected) {
      if (mongoose.isValidObjectId(idOrSlug)) {
        await CategoryModel.findByIdAndDelete(idOrSlug);
      } else {
        await CategoryModel.findOneAndDelete({ slug: idOrSlug });
      }
    }
    if (global._muveraDb) {
      global._muveraDb.categories = global._muveraDb.categories.filter(
        (c) => c.id !== idOrSlug && c.slug !== idOrSlug
      );
    }
    return true;
  },
};
