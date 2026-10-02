import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Coupon } from '@/lib/types';
import { couponService } from '@/modules/coupons';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const subtotal = searchParams.get('subtotal');

  if (code) {
    if (subtotal) {
      const calculation = await couponService.validateAndCalculateDiscount(
        code,
        parseInt(subtotal, 10)
      );
      return NextResponse.json(calculation);
    }

    const coupon = await db.getCouponByCode(code);
    if (!coupon) return NextResponse.json({ error: 'Coupon not found or inactive' }, { status: 404 });
    return NextResponse.json({ coupon });
  }

  const coupons = await db.getCoupons();
  return NextResponse.json({ coupons });
}

export async function POST(req: Request) {
  try {
    const coupon: Coupon = await req.json();
    const saved = await db.saveCoupon(coupon);
    return NextResponse.json({ success: true, coupon: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
