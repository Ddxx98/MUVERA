import mongoose, { Schema, Document } from 'mongoose';

export interface ICouponRedemption extends Document {
  couponCode: string;
  orderId: string;
  customerPhone?: string;
  discountPaise: number;
  redeemedAt: Date;
}

const CouponRedemptionSchema = new Schema<ICouponRedemption>(
  {
    couponCode: { type: String, required: true, uppercase: true, index: true },
    orderId: { type: String, required: true, index: true },
    customerPhone: { type: String },
    discountPaise: { type: Number, required: true },
    redeemedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

CouponRedemptionSchema.index({ couponCode: 1, orderId: 1 }, { unique: true });

export const CouponRedemptionModel =
  mongoose.models.CouponRedemption ||
  mongoose.model<ICouponRedemption>('CouponRedemption', CouponRedemptionSchema);

export { CouponModel } from '@/lib/models/Coupon';
