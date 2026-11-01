import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToMongo } from '@/lib/db';
import { OrderModel } from '@/lib/models/Order';
import { getOptionalUser } from '@/modules/auth/guards';
import { notificationService } from '@/modules/notifications/service';
import { inventoryService } from '@/modules/inventory';
import { jobService } from '@/modules/jobs';
import { serverEnv } from '@/config/env.server';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToMongo();
    const ctx = await getOptionalUser();
    const { action, code } = await req.json();

    const orderId = params.id;
    const order = await OrderModel.findOne({
      $or: [{ id: orderId }, { orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify ownership if authenticated customer
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

    if (order.paymentPreference !== 'cod') {
      return NextResponse.json({ error: 'This order is not configured for Cash on Delivery' }, { status: 400 });
    }

    if (order.orderStatus === 'cancelled') {
      return NextResponse.json({ error: 'This order has been cancelled' }, { status: 400 });
    }

    if (order.codConfirmedAt) {
      return NextResponse.json({
        success: true,
        message: 'Order is already verified and confirmed',
        order: {
          id: order.id,
          orderNo: order.orderNo,
          fulfilmentStatus: order.fulfilmentStatus,
          codConfirmedAt: order.codConfirmedAt,
        },
      });
    }

    if (action === 'send_otp') {
      // Cooldown check (60 seconds)
      if (order.codOtp?.lastSentAt) {
        const timeSinceLast = Date.now() - new Date(order.codOtp.lastSentAt).getTime();
        if (timeSinceLast < 60 * 1000) {
          const waitSecs = Math.ceil((60 * 1000 - timeSinceLast) / 1000);
          return NextResponse.json(
            { error: `Please wait ${waitSecs} seconds before requesting a new code.` },
            { status: 429 }
          );
        }
      }

      // Max send attempts check (3 per order)
      if ((order.codOtp?.sendCount || 0) >= 3) {
        return NextResponse.json(
          { error: 'Maximum verification code attempts reached for this order.' },
          { status: 429 }
        );
      }

      // Check open unfulfilled COD orders limit (max 2)
      if (order.customerId) {
        const openCodCount = await OrderModel.countDocuments({
          customerId: order.customerId,
          paymentPreference: 'cod',
          orderStatus: 'open',
          fulfilmentStatus: { $in: ['unfulfilled', 'allocated', 'picking', 'packed', 'shipped'] },
          _id: { $ne: order._id },
        });

        if (openCodCount >= 2) {
          return NextResponse.json(
            { error: 'You have multiple open Cash on Delivery orders. Please settle pending orders before placing new ones.' },
            { status: 400 }
          );
        }
      }

      // Generate cryptographically secure 6-digit OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      const otpSecret = serverEnv.OTP_SECRET || 'muvera_dev_fallback_otp_secret_key_32chars';
      const hmac = crypto.createHmac('sha256', otpSecret).update(`${order.id}:${otp}`).digest('hex');

      order.codOtp = {
        hash: hmac,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        attempts: 0,
        lastSentAt: new Date(),
        sendCount: (order.codOtp?.sendCount || 0) + 1,
      };
      await order.save();

      // Dispatch to customer email
      const targetEmail = order.customerEmail || (order.shippingAddress as any)?.email;
      if (targetEmail) {
        await notificationService.sendCodOtp(
          targetEmail,
          order.customerName || 'Customer',
          otp,
          order.orderNo || order.id?.slice(-8) || 'COD'
        );
      }

      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${targetEmail || 'your email'}`,
        cooldownSeconds: 60,
      });
    }

    if (action === 'verify_otp') {
      if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'Please enter a valid 6-digit code' }, { status: 400 });
      }

      const cleanCode = code.trim();
      if (!/^\d{6}$/.test(cleanCode)) {
        return NextResponse.json({ error: 'Verification code must be exactly 6 digits' }, { status: 400 });
      }

      // Atomic attempt increment and lock guard
      const updated: any = await OrderModel.findOneAndUpdate(
        {
          _id: (order as any)._id,
          'codOtp.attempts': { $lt: 5 },
          'codOtp.expiresAt': { $gt: new Date() },
        },
        { $inc: { 'codOtp.attempts': 1 } },
        { new: true }
      );

      if (!updated || !updated.codOtp?.hash) {
        return NextResponse.json(
          { error: 'Verification code has expired or exceeded max attempts. Please request a new code.' },
          { status: 400 }
        );
      }

      // Timing-safe HMAC check
      const otpSecret = serverEnv.OTP_SECRET || 'muvera_dev_fallback_otp_secret_key_32chars';
      const expectedHmac = updated.codOtp.hash;
      const candidateHmac = crypto.createHmac('sha256', otpSecret).update(`${order.id}:${cleanCode}`).digest('hex');

      const expBuf = Buffer.from(expectedHmac, 'utf8');
      const candBuf = Buffer.from(candidateHmac, 'utf8');
      const isMatch = expBuf.length === candBuf.length && crypto.timingSafeEqual(expBuf, candBuf);

      if (!isMatch) {
        return NextResponse.json({ error: 'Invalid verification code. Please check and try again.' }, { status: 400 });
      }

      // Commit stock hold
      await inventoryService.commitReservation(
        order.id,
        order.items.map((i: any) => ({
          variantId: i.variantId,
          sku: i.sku,
          quantity: i.quantity,
        }))
      );

      // Transition order status
      const now = new Date();
      updated.codConfirmedAt = now;
      updated.fulfilmentStatus = 'allocated';
      if (updated.codOtp) {
        updated.codOtp.hash = undefined;
      }
      updated.timeline.push({
        id: `ev_${Date.now()}_cod_confirmed`,
        status: 'allocated',
        description: 'Cash on Delivery verified via email OTP. Stock committed and queued for fulfillment.',
        actor: 'Customer OTP Verification',
        createdAt: now.toISOString(),
      });
      await updated.save();

      // Enqueue order.onConfirmed job
      await jobService.enqueueJob('order_on_confirmed', { orderId: updated.id }, { dedupeKey: `cod_confirmed_${updated.id}` });

      return NextResponse.json({
        success: true,
        message: 'Order verified and confirmed successfully!',
        order: {
          id: updated.id,
          orderNo: updated.orderNo,
          fulfilmentStatus: updated.fulfilmentStatus,
          codConfirmedAt: updated.codConfirmedAt,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action. Supported actions: send_otp, verify_otp' }, { status: 400 });
  } catch (err: any) {
    console.error('COD confirmation error:', err);
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
