import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToMongo } from '@/lib/db';
import { OrderModel } from '@/lib/models/Order';
import { WebhookEventModel } from '@/lib/models/WebhookEvent';
import { RefundModel } from '@/lib/models/Refund';
import { inventoryService } from '@/modules/inventory';
import { jobService } from '@/modules/jobs';
import { serverEnv } from '@/config/env.server';

export async function POST(req: Request) {
  try {
    await connectToMongo();

    // Read raw body for HMAC check
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const eventIdHeader = req.headers.get('x-razorpay-event-id');

    const secret = serverEnv.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[RAZORPAY WEBHOOK] RAZORPAY_WEBHOOK_SECRET is not configured.');
      return NextResponse.json({ error: 'Webhook secret unconfigured' }, { status: 500 });
    }

    // Length-guarded HMAC check
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const sigBuf = Buffer.from(signature, 'utf8');

    if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
      console.warn('[RAZORPAY WEBHOOK] Invalid HMAC signature received.');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventKey = eventIdHeader || event.id || `rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Deduplication check via WebhookEventModel insert-first
    let eventDoc: any;
    try {
      eventDoc = await WebhookEventModel.create({
        source: 'razorpay',
        eventKey,
        payload: event,
        status: 'processing',
      });
    } catch (err: any) {
      if (err.code === 11000) {
        // Event already exists
        const existing = await WebhookEventModel.findOne({ source: 'razorpay', eventKey });
        if (existing?.status === 'processed') {
          return NextResponse.json({ success: true, message: 'Event already processed' }, { status: 200 });
        }
        return NextResponse.json({ error: 'Event currently in processing' }, { status: 503 });
      }
      throw err;
    }

    const eventType = event.event;
    // We handle payment.captured and order.paid
    if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
      eventDoc.status = 'informational';
      await eventDoc.save();
      return NextResponse.json({ success: true, message: 'Event ignored (not payment event)' }, { status: 200 });
    }

    const payment = event.payload?.payment?.entity;
    const rzpOrder = event.payload?.order?.entity;
    const rzpOrderId = payment?.order_id || rzpOrder?.id;
    const paymentId = payment?.id || `pay_captured_${Date.now()}`;
    const capturedAmountPaise = Number(payment?.amount ?? rzpOrder?.amount_paid ?? 0);
    const currency = (payment?.currency || rzpOrder?.currency || 'INR').toUpperCase();
    const orderRef = payment?.notes?.orderId || rzpOrder?.notes?.orderId || rzpOrder?.receipt;

    // Locate order
    const orderQuery: any = {
      $or: [],
    };
    if (orderRef) {
      orderQuery.$or.push({ id: orderRef }, { orderId: orderRef });
      if (orderRef.match(/^[0-9a-fA-F]{24}$/)) orderQuery.$or.push({ _id: orderRef });
    }
    if (rzpOrderId) {
      orderQuery.$or.push({ razorpayOrderId: rzpOrderId });
    }

    if (orderQuery.$or.length === 0) {
      eventDoc.status = 'failed';
      eventDoc.error = 'No order identifier found in webhook payload';
      await eventDoc.save();
      return NextResponse.json({ success: true, message: 'No order identifier found' }, { status: 200 });
    }

    const order = await OrderModel.findOne(orderQuery);
    if (!order) {
      console.warn(`[RAZORPAY WEBHOOK] Order not found for reference: ${orderRef || rzpOrderId}`);
      eventDoc.status = 'failed';
      eventDoc.error = `Order not found for reference: ${orderRef || rzpOrderId}`;
      await eventDoc.save();
      return NextResponse.json({ success: true, message: 'Order not found' }, { status: 200 });
    }

    // Tampered amount or currency check
    if (capturedAmountPaise !== order.totalPaise || currency !== 'INR') {
      console.error(
        `[RAZORPAY TAMPER ALERT] Amount/currency mismatch for order ${order.id}: expected ${order.totalPaise} INR, got ${capturedAmountPaise} ${currency}`
      );
      eventDoc.status = 'rejected_amount_mismatch';
      eventDoc.error = `Amount mismatch: expected ${order.totalPaise} INR, got ${capturedAmountPaise} ${currency}`;
      await eventDoc.save();

      order.needsAttention = true;
      order.needsAttentionReason = `Payment amount mismatch: received ${capturedAmountPaise} paise, order is ${order.totalPaise} paise.`;
      await order.save();

      // Create durable refund record
      await RefundModel.create({
        orderId: order.id,
        orderNo: order.orderNo,
        paymentId,
        amountPaise: capturedAmountPaise,
        reason: 'amount_mismatch',
        sourceId: order.id,
        idempotencyKey: `${paymentId}:amount_mismatch:${order.id}`,
        status: 'pending',
      }).catch((e) => console.warn('Refund record duplicate or insert error:', e));

      await jobService.enqueueJob('process_refund', {
        paymentId,
        amountPaise: capturedAmountPaise,
        orderId: order.id,
        reason: 'amount_mismatch',
      });

      // Always return 200 to keep Razorpay webhook endpoint active
      return NextResponse.json({ success: true, message: 'Amount mismatch recorded and queued for refund' }, { status: 200 });
    }

    // Duplicate payment on already paid order
    if (order.paymentStatus === 'paid') {
      console.warn(`[RAZORPAY WEBHOOK] Order ${order.id} already marked paid. Enqueuing duplicate payment refund.`);
      await RefundModel.create({
        orderId: order.id,
        orderNo: order.orderNo,
        paymentId,
        amountPaise: capturedAmountPaise,
        reason: 'duplicate_payment',
        sourceId: paymentId,
        idempotencyKey: `${paymentId}:duplicate_payment:${order.id}`,
        status: 'pending',
      }).catch((e) => console.warn('Refund record duplicate or insert error:', e));

      await jobService.enqueueJob('process_refund', {
        paymentId,
        amountPaise: capturedAmountPaise,
        orderId: order.id,
        reason: 'duplicate_payment',
      });

      eventDoc.status = 'processed';
      await eventDoc.save();
      return NextResponse.json({ success: true, message: 'Duplicate payment queued for refund' }, { status: 200 });
    }

    // Late payment arrival after order was cancelled
    if (order.orderStatus === 'cancelled') {
      console.warn(`[RAZORPAY WEBHOOK] Payment received for cancelled order ${order.id}. Enqueuing refund.`);
      order.paymentStatus = 'refund_pending';
      order.needsAttention = true;
      order.needsAttentionReason = 'Payment arrived after order was cancelled. Automatic refund triggered.';
      await order.save();

      await RefundModel.create({
        orderId: order.id,
        orderNo: order.orderNo,
        paymentId,
        amountPaise: capturedAmountPaise,
        reason: 'late_payment_out_of_stock',
        sourceId: order.id,
        idempotencyKey: `${paymentId}:late_payment_out_of_stock:${order.id}`,
        status: 'pending',
      }).catch((e) => console.warn('Refund record duplicate or insert error:', e));

      await jobService.enqueueJob('process_refund', {
        paymentId,
        amountPaise: capturedAmountPaise,
        orderId: order.id,
        reason: 'late_payment_out_of_stock',
      });

      eventDoc.status = 'processed';
      await eventDoc.save();
      return NextResponse.json({ success: true, message: 'Late payment queued for refund' }, { status: 200 });
    }

    // Happy Path: Commit stock reservation and transition to paid / allocated
    await inventoryService.commitReservation(
      order.id,
      order.items.map((i: any) => ({
        variantId: i.variantId,
        sku: i.sku,
        quantity: i.quantity,
      }))
    );

    const now = new Date();
    order.paymentStatus = 'paid';
    order.fulfilmentStatus = 'allocated';
    order.timeline.push({
      id: `ev_${Date.now()}_paid`,
      status: 'allocated',
      description: `Payment of ₹${(order.totalPaise / 100).toFixed(2)} captured via Razorpay (${paymentId}). Stock committed.`,
      actor: 'Razorpay Webhook',
      createdAt: now.toISOString(),
    });
    await order.save();

    eventDoc.status = 'processed';
    await eventDoc.save();

    // Enqueue order.onPaid background job
    await jobService.enqueueJob(
      'order_on_paid',
      { orderId: order.id, paymentId },
      { dedupeKey: `order_on_paid_${order.id}` }
    );

    return NextResponse.json({ success: true, message: 'Payment successfully processed' }, { status: 200 });
  } catch (err: any) {
    console.error('[RAZORPAY WEBHOOK ERROR]:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
