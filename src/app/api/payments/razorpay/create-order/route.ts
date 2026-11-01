import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { connectToMongo } from '@/lib/db';
import { OrderModel } from '@/lib/models/Order';
import { getOptionalUser } from '@/modules/auth/guards';
import { serverEnv } from '@/config/env.server';

export async function POST(req: Request) {
  try {
    await connectToMongo();
    const ctx = await getOptionalUser();
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await OrderModel.findOne({
      $or: [{ id: orderId }, { orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify ownership if logged in as customer
    if (ctx && ctx.role !== 'admin') {
      const idMatch = ctx.id && order.customerId && ctx.id === order.customerId;
      const ownerEmail = order.customerEmail || '';
      const ownerPhone = (order.customerPhone || '').replace(/\D/g, '').slice(-10);
      const userPhone = (ctx.phone || '').replace(/\D/g, '').slice(-10);
      const emailMatch = ownerEmail && ctx.email.toLowerCase() === ownerEmail.toLowerCase();
      const phoneMatch = ownerPhone && userPhone && userPhone === ownerPhone;
      if (!idMatch && !emailMatch && !phoneMatch) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'This order has already been paid' }, { status: 400 });
    }

    if (order.orderStatus === 'cancelled') {
      return NextResponse.json({ error: 'This order has been cancelled' }, { status: 400 });
    }

    // Check reservation hold (20 minutes)
    const orderCreatedAt = new Date(order.createdAt).getTime();
    const holdDurationMs = 20 * 60 * 1000;
    const isHoldExpired = Date.now() - orderCreatedAt > holdDurationMs;
    if (isHoldExpired) {
      return NextResponse.json(
        { error: 'Stock reservation expired for this order. Please place a new order.' },
        { status: 400 }
      );
    }

    // Minimum amount validation
    if (order.totalPaise < 100) {
      return NextResponse.json(
        { error: 'Order total must be at least 100 paise (₹1.00)' },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID || serverEnv.RAZORPAY_KEY_ID || 'rzp_test_TuudQgm3IquOy4';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || serverEnv.RAZORPAY_KEY_SECRET || 'dtlarEcr0wXAy7YDKMVXzebW';

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay API keys not configured' }, { status: 500 });
    }

    // If order already has a Razorpay order ID, reuse it
    if (order.razorpayOrderId && !order.razorpayOrderId.startsWith('order_mock_')) {
      return NextResponse.json({
        success: true,
        razorpayOrderId: order.razorpayOrderId,
        order_id: order.razorpayOrderId,
        amountPaise: order.totalPaise,
        amount: order.totalPaise,
        currency: 'INR',
        keyId,
        key_id: keyId,
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const receipt = (order.orderNo || order.id).slice(0, 40);

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(order.totalPaise),
      currency: 'INR',
      receipt,
      notes: {
        orderId: order.id,
        orderNo: order.orderNo,
        customerPhone: order.customerPhone,
      },
    });

    order.razorpayOrderId = rzpOrder.id;
    order.paymentPreference = 'razorpay';
    await order.save();

    return NextResponse.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      order_id: rzpOrder.id,
      amountPaise: order.totalPaise,
      amount: rzpOrder.amount,
      currency: 'INR',
      keyId,
      key_id: keyId,
    });
  } catch (err: any) {
    console.error('[CREATE RAZORPAY ORDER ERROR]:', err);
    return NextResponse.json({ error: err.message || 'Failed to initialize payment' }, { status: 500 });
  }
}
