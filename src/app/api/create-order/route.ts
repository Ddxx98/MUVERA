import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { connectToMongo } from '@/lib/db';
import { OrderModel } from '@/lib/models/Order';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let { amount, currency = 'INR', receipt, notes = {}, orderId } = body;

    // If orderId is provided, look up the order and sync amount
    if (orderId && !amount) {
      await connectToMongo();
      const existingOrder = await OrderModel.findOne({
        $or: [{ id: orderId }, { orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
      });
      if (existingOrder) {
        amount = existingOrder.totalPaise;
        receipt = receipt || existingOrder.orderNo || existingOrder.id;
        notes = { ...notes, orderId: existingOrder.id, orderNo: existingOrder.orderNo };
      }
    }

    // Validate minimum amount (100 paise = ₹1.00)
    const amountPaise = Number(amount);
    if (!amountPaise || isNaN(amountPaise) || amountPaise < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 paise (₹1.00)' },
        { status: 400 }
      );
    }

    const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return NextResponse.json(
        { error: 'Razorpay API credentials not configured in environment' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const receiptId = (receipt || `rcpt_${Date.now()}`).toString().slice(0, 40);

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(amountPaise),
      currency: (currency || 'INR').toUpperCase(),
      receipt: receiptId,
      notes,
    });

    // If linked to an order in our database, persist the razorpayOrderId
    if (orderId) {
      await connectToMongo();
      await OrderModel.updateOne(
        { $or: [{ id: orderId }, { orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }] },
        { $set: { razorpayOrderId: rzpOrder.id, paymentPreference: 'razorpay' } }
      ).catch(() => null);
    }

    return NextResponse.json({
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key_id,
    });
  } catch (err: any) {
    console.error('[RAZORPAY CREATE ORDER ERROR]:', err);
    const statusCode = err?.statusCode || (err?.error?.description?.includes('Authentication') ? 401 : 500);
    return NextResponse.json(
      { error: err?.error?.description || err.message || 'Failed to create Razorpay order' },
      { status: statusCode }
    );
  }
}
