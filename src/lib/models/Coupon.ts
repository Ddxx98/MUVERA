import mongoose, { Schema, Document, Model } from 'mongoose';
import { Coupon as CouponType } from '../types';

export interface CouponDocument extends Document, Omit<CouponType, 'code'> {
  code: string;
}

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    value: { type: Number, required: true },
    minOrderValuePaise: { type: Number, required: true },
    maxDiscountPaise: { type: Number },
    expiresAt: { type: String, required: true },
    usageCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const CouponModel: Model<CouponDocument> =
  mongoose.models.Coupon || mongoose.model<CouponDocument>('Coupon', CouponSchema);
