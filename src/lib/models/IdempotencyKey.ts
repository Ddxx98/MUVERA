import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  customerId: string;
  requestHash: string;
  status: 'in_progress' | 'completed' | 'failed';
  orderId?: string;
  response?: any;
  leaseExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: { type: String, required: true },
    customerId: { type: String, required: true, index: true },
    requestHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'failed'],
      default: 'in_progress',
      required: true,
    },
    orderId: { type: String },
    response: { type: Schema.Types.Mixed },
    leaseExpiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Compound unique index ensuring idempotency is scoped strictly per customer
IdempotencyKeySchema.index({ customerId: 1, key: 1 }, { unique: true });

// Auto-expire cache after 24 hours
IdempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const IdempotencyKeyModel: Model<IIdempotencyKey> =
  mongoose.models.IdempotencyKey || mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);
