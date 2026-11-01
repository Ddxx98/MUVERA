import mongoose, { Schema, Document, Model } from 'mongoose';

export type ShipmentDirection = 'forward' | 'return';

export type ShipmentStatus =
  | 'created'
  | 'manifested'
  | 'pickup_exception'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'ndr_undelivered'
  | 'rto_initiated'
  | 'rto_in_transit'
  | 'rto_delivered'
  | 'delivered'
  | 'cancelled'
  | 'lost'
  | 'damaged'
  | 'destroyed';

export interface IShipment extends Document {
  orderId: string;
  orderNo: string;
  returnId?: string;
  direction: ShipmentDirection;
  awb: string;
  courierName: string;
  courierId?: number;
  status: ShipmentStatus;
  lastStatusTimestamp?: Date;
  lastScanLocation?: string;
  dimensions: {
    lengthCm: number;
    breadthCm: number;
    heightCm: number;
  };
  deadWeightKg: number;
  cod: {
    isCod: boolean;
    amountPaise: number;
    collected: boolean;
    remitted: boolean;
    remittanceUtr?: string;
    remittanceBatchId?: string;
  };
  ndr: {
    attemptCount: number;
    lastReason?: string;
    usedAttempts: number[];
    reattemptDate?: string;
    lastInstructions?: string;
  };
  qc?: {
    status?: 'passed' | 'failed';
    images?: string[];
    failureReason?: string;
  };
  srOrderId?: string;
  srShipmentId?: number;
  channelOrderId?: string;
  shippingSyncStatus?: 'not_synced' | 'creating' | 'synced' | 'sync_failed';
  awbStatus?: 'pending' | 'assigned' | 'failed';
  pickupScheduled?: boolean;
  labelGenerated?: boolean;
  labelUrl?: string;
  cancellationStatus?: 'none' | 'pending' | 'cancelled' | 'refused';
  needsAttention?: boolean;
  needsAttentionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipment>(
  {
    orderId: { type: String, required: true, index: true },
    orderNo: { type: String, required: true, index: true },
    returnId: { type: String, index: true },
    direction: { type: String, enum: ['forward', 'return'], required: true, default: 'forward', index: true },
    awb: { type: String, index: true },
    srOrderId: { type: String, index: true },
    srShipmentId: { type: Number, index: true },
    channelOrderId: { type: String, index: true },
    shippingSyncStatus: {
      type: String,
      enum: ['not_synced', 'creating', 'synced', 'sync_failed'],
      default: 'not_synced',
      index: true,
    },
    awbStatus: {
      type: String,
      enum: ['pending', 'assigned', 'failed'],
      default: 'pending',
      index: true,
    },
    pickupScheduled: { type: Boolean, default: false },
    labelGenerated: { type: Boolean, default: false },
    labelUrl: { type: String },
    cancellationStatus: {
      type: String,
      enum: ['none', 'pending', 'cancelled', 'refused'],
      default: 'none',
    },
    needsAttention: { type: Boolean, default: false },
    needsAttentionReason: { type: String },
    courierName: { type: String, required: true },
    courierId: { type: Number },
    status: {
      type: String,
      enum: [
        'created',
        'manifested',
        'pickup_exception',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'ndr_undelivered',
        'rto_initiated',
        'rto_in_transit',
        'rto_delivered',
        'delivered',
        'cancelled',
        'lost',
        'damaged',
        'destroyed',
      ],
      default: 'created',
      index: true,
    },
    lastStatusTimestamp: { type: Date },
    lastScanLocation: { type: String },
    dimensions: {
      lengthCm: { type: Number, default: 25 },
      breadthCm: { type: Number, default: 20 },
      heightCm: { type: Number, default: 3 },
    },
    deadWeightKg: { type: Number, default: 0.5 },
    cod: {
      isCod: { type: Boolean, default: false },
      amountPaise: { type: Number, default: 0 },
      collected: { type: Boolean, default: false },
      remitted: { type: Boolean, default: false },
      remittanceUtr: { type: String },
      remittanceBatchId: { type: String },
    },
    ndr: {
      attemptCount: { type: Number, default: 0 },
      lastReason: { type: String },
      usedAttempts: { type: [Number], default: [] },
      reattemptDate: { type: String },
      lastInstructions: { type: String },
    },
    qc: {
      status: { type: String, enum: ['passed', 'failed'] },
      images: { type: [String], default: [] },
      failureReason: { type: String },
    },
  },
  { timestamps: true }
);

ShipmentSchema.index({ orderId: 1, direction: 1 });
ShipmentSchema.index({ status: 1, lastStatusTimestamp: -1 });

// Partial unique index for non-null AWBs
ShipmentSchema.index(
  { awb: 1 },
  { unique: true, partialFilterExpression: { awb: { $type: 'string' } } }
);

export const ShipmentModel: Model<IShipment> =
  mongoose.models.Shipment || mongoose.model<IShipment>('Shipment', ShipmentSchema);
