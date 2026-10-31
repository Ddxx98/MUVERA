import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICodRemittance extends Document {
  batchNo: string;
  crfId: string;
  utr: string;
  fileHash: string;
  transferDate: string;
  grossCollectedPaise: number;
  courierFeesPaise: number;
  netRemittedPaise: number;
  shipmentCount: number;
  shipmentIds: string[];
  variancePaise: number;
  importedBy: string;
  status: 'reconciled' | 'discrepancy' | 'pending';
  rawSummary?: any;
  createdAt: Date;
  updatedAt: Date;
}

const CodRemittanceSchema = new Schema<ICodRemittance>(
  {
    batchNo: { type: String, required: true, unique: true, index: true },
    crfId: { type: String, required: true, unique: true, index: true },
    utr: { type: String, required: true, index: true },
    fileHash: { type: String, required: true, index: true },
    transferDate: { type: String, required: true },
    grossCollectedPaise: { type: Number, required: true },
    courierFeesPaise: { type: Number, required: true },
    netRemittedPaise: { type: Number, required: true },
    shipmentCount: { type: Number, required: true },
    shipmentIds: { type: [String], default: [] },
    variancePaise: { type: Number, default: 0 },
    importedBy: { type: String, required: true },
    status: {
      type: String,
      enum: ['reconciled', 'discrepancy', 'pending'],
      default: 'reconciled',
      index: true,
    },
    rawSummary: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const CodRemittanceModel: Model<ICodRemittance> =
  mongoose.models.CodRemittance || mongoose.model<ICodRemittance>('CodRemittance', CodRemittanceSchema);
