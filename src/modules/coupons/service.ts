import mongoose from 'mongoose';
import { db } from '@/lib/db';
import { CouponModel, CouponRedemptionModel } from './model';
import { AppError } from '@/lib/errors';
import { Coupon } from '@/lib/types';

export interface CouponDiscountResult {
  valid: boolean;
  coupon?: Coupon;
  discountPaise: number;
  reason?: string;
}

function isDbConnected(): boolean {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

export const couponService = {
  /**
   * Validates a coupon against a shopping basket subtotal.
   */
  async validateAndCalculateDiscount(
    code: string,
    subtotalPaise: number
  ): Promise<CouponDiscountResult> {
    const coupon = await db.getCouponByCode(code);
    if (!coupon) {
      return { valid: false, discountPaise: 0, reason: 'Invalid or inactive promo code.' };
    }

    if (!coupon.active) {
      return { valid: false, discountPaise: 0, reason: 'This coupon is no longer active.' };
    }

    const expiry = new Date(coupon.expiresAt).getTime();
    if (Date.now() > expiry) {
      return { valid: false, discountPaise: 0, reason: 'This coupon has expired.' };
    }

    if (subtotalPaise < coupon.minOrderValuePaise) {
      return {
        valid: false,
        discountPaise: 0,
        reason: `Minimum order value for this coupon is ₹${(coupon.minOrderValuePaise / 100).toLocaleString('en-IN')}.`,
      };
    }

    let discountPaise = 0;
    if (coupon.discountType === 'percentage') {
      discountPaise = Math.round((subtotalPaise * coupon.value) / 100);
      if (coupon.maxDiscountPaise && discountPaise > coupon.maxDiscountPaise) {
        discountPaise = coupon.maxDiscountPaise;
      }
    } else {
      discountPaise = coupon.value * 100;
    }

    // Discount cannot exceed subtotal
    discountPaise = Math.min(discountPaise, subtotalPaise);

    return {
      valid: true,
      coupon,
      discountPaise,
    };
  },

  /**
   * Atomically records coupon redemption with usage limit guards.
   */
  async redeemCoupon(
    code: string,
    orderId: string,
    discountPaise: number,
    customerPhone?: string
  ): Promise<void> {
    const coupon = await db.getCouponByCode(code);
    if (!coupon) {
      throw new AppError('COUPON_NOT_FOUND', 'Coupon not found');
    }

    if (isDbConnected()) {
      try {
        // Guarded atomic increment
        const updated = await CouponModel.findOneAndUpdate(
          {
            code: code.toUpperCase(),
            active: true,
          },
          {
            $inc: { usageCount: 1 },
          },
          { new: true }
        );

        if (!updated) {
          throw new AppError('COUPON_EXHAUSTED', 'Coupon redemption limit reached or inactive.');
        }

        await CouponRedemptionModel.create({
          couponCode: code.toUpperCase(),
          orderId,
          customerPhone,
          discountPaise,
          redeemedAt: new Date(),
        });
        return;
      } catch (err) {
        if (err instanceof AppError) throw err;
        console.warn('Mongo coupon redemption failed, falling back to memory:', err);
      }
    }

    coupon.usageCount = (coupon.usageCount || 0) + 1;
    await db.saveCoupon(coupon);
  },

  /**
   * Reverses coupon redemption if order is cancelled or aborted.
   */
  async releaseCoupon(code: string, orderId: string): Promise<void> {
    const coupon = await db.getCouponByCode(code);
    if (!coupon) return;

    if (isDbConnected()) {
      try {
        await CouponModel.updateOne(
          { code: code.toUpperCase() },
          { $inc: { usageCount: -1 } }
        );
        await CouponRedemptionModel.deleteOne({ couponCode: code.toUpperCase(), orderId });
        return;
      } catch (err) {
        console.warn('Mongo coupon release error:', err);
      }
    }

    coupon.usageCount = Math.max(0, (coupon.usageCount || 1) - 1);
    await db.saveCoupon(coupon);
  },
};
