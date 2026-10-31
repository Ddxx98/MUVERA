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
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipment>(
  {
    orderId: { type: String, required: true, index: true },
    orderNo: { type: String, required: true, index: true },
    returnId: { type: String, index: true },
    direction: { type: String, enum: ['forward', 'return'], required: true, default: 'forward', index: true },
    awb: { type: String, required: true, unique: true, index: true },
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

export const ShipmentModel: Model<IShipment> =
  mongoose.models.Shipment || mongoose.model<IShipment>('Shipment', ShipmentSchema);
