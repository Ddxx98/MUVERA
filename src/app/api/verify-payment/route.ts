import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToMongo } from '@/lib/db';
import { OrderModel } from '@/lib/models/Order';
import { inventoryService } from '@/modules/inventory';
import { jobService } from '@/modules/jobs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are mandatory',
        },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('[RAZORPAY VERIFY] RAZORPAY_KEY_SECRET is not configured');
      return NextResponse.json(
        { success: false, error: 'Payment gateway configuration error' },
        { status: 500 }
      );
    }

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Length-guarded constant-time comparison to prevent timing attacks
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const sigBuf = Buffer.from(razorpay_signature, 'utf8');
    const isValid = expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);

    if (!isValid) {
      console.warn(`[RAZORPAY VERIFY] Signature mismatch for payment ${razorpay_payment_id} on order ${razorpay_order_id}`);
      return NextResponse.json(
        { success: false, error: 'Signature verification failed. Invalid payment proof.' },
        { status: 400 }
      );
    }

    // If order is linked, update order status in DB
    if (orderId) {
      await connectToMongo();
      const order = await OrderModel.findOne({
        $or: [{ id: orderId }, { orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
      });

      if (order && order.paymentStatus !== 'paid') {
        // Commit stock reservation
        await inventoryService.commitReservation(
          order.id,
          order.items.map((i: any) => ({
            variantId: i.variantId,
            sku: i.sku,
            quantity: i.quantity,
          }))
        );

        order.paymentStatus = 'paid';
        order.fulfilmentStatus = 'allocated';
        order.razorpayOrderId = razorpay_order_id;
        order.timeline.push({
          id: `ev_${Date.now()}_paid_verified`,
          status: 'allocated',
          description: `Payment ₹${((order.totalPaise || 0) / 100).toFixed(2)} verified via Razorpay Standard Checkout (${razorpay_payment_id}).`,
          actor: 'Razorpay Client Verification',
          createdAt: new Date().toISOString(),
        });
        await order.save();

        // Enqueue background fulfillment job
        await jobService.enqueueJob(
          'order_on_paid',
          { orderId: order.id, paymentId: razorpay_payment_id },
          { dedupeKey: `order_paid_${order.id}` }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (err: any) {
    console.error('[RAZORPAY VERIFY ERROR]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
