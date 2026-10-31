import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShipmentScan extends Document {
  awb: string;
  timestamp: Date;
  status: string;
  location: string;
  activity: string;
  srStatusId?: number;
  raw?: any;
  createdAt: Date;
}

const ShipmentScanSchema = new Schema<IShipmentScan>(
  {
    awb: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    status: { type: String, required: true },
    location: { type: String, default: '' },
    activity: { type: String, required: true },
    srStatusId: { type: Number },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Unique compound index prevents duplicate scans from recurring webhooks
ShipmentScanSchema.index({ awb: 1, timestamp: 1, status: 1, location: 1 }, { unique: true });

export const ShipmentScanModel: Model<IShipmentScan> =
  mongoose.models.ShipmentScan || mongoose.model<IShipmentScan>('ShipmentScan', ShipmentScanSchema);
