import mongoose, { Schema, Document, Model } from 'mongoose';
import { OrderSnapshot as OrderSnapshotType } from '../types';

export interface OrderDocument extends Document, Omit<OrderSnapshotType, 'id' | 'createdAt' | 'updatedAt' | 'codConfirmedAt' | 'codOtp'> {
  id: string;
  codConfirmedAt?: Date | string;
  sweepingUntil?: Date;
  codOtp?: {
    hash?: string;
    expiresAt?: Date | string;
    attempts?: number;
    lastSentAt?: Date | string;
    sendCount?: number;
  };
  createdAt: any;
  updatedAt: any;
}

const OrderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    variantId: { type: String, required: true },
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    brand: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    sellingPricePaise: { type: Number, required: true },
    mrpPaise: { type: Number, required: true },
    image: { type: String, required: true },
  },
  { _id: false }
);

const OrderEventSchema = new Schema(
  {
    status: { type: String, required: true },
    description: { type: String, required: true },
    actor: { type: String, default: 'Customer' },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const ShippingAddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    apartment: { type: String },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true, index: true },
    id: { type: String, index: true },
    orderId: { type: String, index: true },
    customerId: { type: String, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true, index: true },
    customerEmail: { type: String },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    deliveryMethod: { type: String, default: 'express_60' },
    paymentPreference: {
      type: String,
      enum: ['upi_whatsapp', 'cod_whatsapp', 'online_gateway', 'cod', 'razorpay', 'manual_upi'],
      default: 'upi_whatsapp',
    },
    paymentStatus: {
      type: String,
      enum: ['pending_whatsapp', 'pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded', 'void', 'refund_pending'],
      default: 'pending_whatsapp',
      index: true,
    },
    fulfilmentStatus: {
      type: String,
      enum: ['unfulfilled', 'allocated', 'picking', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'returned', 'cancelled'],
      default: 'unfulfilled',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ['open', 'processing', 'completed', 'cancel_pending', 'cancelled'],
      default: 'open',
      index: true,
    },
    idempotencyKey: { type: String },
    codConfirmedAt: { type: Date },
    codOtp: {
      hash: { type: String },
      expiresAt: { type: Date },
      attempts: { type: Number, default: 0 },
      lastSentAt: { type: Date },
      sendCount: { type: Number, default: 0 },
    },
    razorpayOrderId: { type: String },
    shippingSyncStatus: {
      type: String,
      enum: ['not_synced', 'creating', 'synced', 'sync_failed'],
      default: 'not_synced',
    },
    needsAttention: { type: Boolean, default: false },
    needsAttentionReason: { type: String },
    estimatedDeliveryDate: { type: String },
    migrationTag: { type: String },
    migrationReviewStatus: { type: String },
    requiresUnpacking: { type: Boolean, default: false },
    sweepingUntil: { type: Date },
    items: [OrderItemSchema],
    subtotalPaise: { type: Number, required: true },
    discountPaise: { type: Number, default: 0 },
    deliveryFeePaise: { type: Number, default: 0 },
    totalPaise: { type: Number, required: true },
    couponCode: { type: String },
    timeline: [OrderEventSchema],
    assignedRider: {
      name: { type: String },
      phone: { type: String },
      vehicleNo: { type: String },
      etaMinutes: { type: Number },
    },
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });

// Partial compound index protecting legacy keyless orders from uniqueness conflicts
OrderSchema.index(
  { customerId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  }
);

export const OrderModel: Model<OrderDocument> =
  mongoose.models.Order || mongoose.model<OrderDocument>('Order', OrderSchema);
