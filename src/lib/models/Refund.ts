import mongoose, { Schema, Document, Model } from 'mongoose';

export type RefundReason =
  | 'late_payment_out_of_stock'
  | 'duplicate_payment'
  | 'amount_mismatch'
  | 'order_cancelled'
  | 'rto_return'
  | 'customer_return';

export type RefundStatus = 'pending' | 'processed' | 'failed';

export interface IRefund extends Document {
  orderId: string;
  orderNo: string;
  paymentId: string;
  amountPaise: number;
  reason: RefundReason;
  sourceId: string;
  idempotencyKey: string;
  status: RefundStatus;
  gatewayRefundId?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    orderId: { type: String, required: true, index: true },
    orderNo: { type: String, required: true, index: true },
    paymentId: { type: String, required: true, index: true },
    amountPaise: { type: Number, required: true },
    reason: {
      type: String,
      enum: ['late_payment_out_of_stock', 'duplicate_payment', 'amount_mismatch', 'order_cancelled', 'rto_return', 'customer_return'],
      required: true,
    },
    sourceId: { type: String, required: true },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
      required: true,
      index: true,
    },
    gatewayRefundId: { type: String },
    error: { type: String },
  },
  { timestamps: true }
);

export const RefundModel: Model<IRefund> =
  mongoose.models.Refund || mongoose.model<IRefund>('Refund', RefundSchema);
