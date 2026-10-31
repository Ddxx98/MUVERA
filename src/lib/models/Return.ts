import mongoose, { Schema, Document, Model } from 'mongoose';
import { ReturnRequest as ReturnRequestType } from '../types';

export interface ReturnDocument extends Document, Omit<ReturnRequestType, 'id'> {
  _id: any;
}

const ReturnSchema = new Schema(
  {
    returnNo: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    orderNo: { type: String, required: true, index: true },
    customerId: { type: String, index: true },
    customerPhone: { type: String, required: true, index: true },
    items: [
      {
        variantId: { type: String, required: true },
        productName: { type: String, required: true },
        size: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        reason: { type: String, required: true },
        condition: { type: String, enum: ['unopened', 'opened_tags_intact', 'damaged'] },
        inspectionDecision: { type: String, enum: ['restock', 'damaged_write_off'] },
      },
    ],
    resolutionPreference: {
      type: String,
      enum: ['upi_refund', 'bank_transfer', 'store_credit'],
      default: 'upi_refund',
    },
    status: {
      type: String,
      enum: ['requested', 'approved', 'in_transit', 'received', 'inspected', 'closed', 'rejected'],
      default: 'requested',
      index: true,
    },
    refundAmountPaise: { type: Number, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

ReturnSchema.index({ customerId: 1, createdAt: -1 });

export const ReturnModel: Model<ReturnDocument> =
  mongoose.models.Return || mongoose.model<ReturnDocument>('Return', ReturnSchema);
