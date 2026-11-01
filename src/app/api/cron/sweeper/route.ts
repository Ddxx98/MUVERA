import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToMongo } from '@/lib/db';
import { OrderModel, ShipmentModel } from '@/lib/models';
import { inventoryService } from '@/modules/inventory';
import { couponService } from '@/modules/coupons';
import { jobService } from '@/modules/jobs';
import { serverEnv } from '@/config/env.server';

export async function GET(req: Request) {
  // Machine route: constant-time CRON_SECRET verification
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = serverEnv.CRON_SECRET;
  const expected = `Bearer ${cronSecret}`;

  const authBuf = Buffer.from(authHeader.padEnd(expected.length));
  const expectedBuf = Buffer.from(expected.padEnd(authHeader.length));
  const isValid =
    authBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(authBuf, expectedBuf) &&
    authHeader === expected;

  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToMongo();
    const now = new Date();
    let cancelledCount = 0;
    let autoAppliedCount = 0;
    let recoveredShipmentCount = 0;

    // 1. Sweeper for expired reservations (20m hold + 5m grace = 25m)
    const expiredThreshold = new Date(Date.now() - 25 * 60 * 1000);
    const expiredOrders = await OrderModel.find({
      orderStatus: 'open',
      paymentStatus: { $in: ['pending', 'pending_whatsapp'] },
      codConfirmedAt: null,
      createdAt: { $lte: expiredThreshold },
      $or: [{ sweepingUntil: { $exists: false } }, { sweepingUntil: { $lte: now } }],
    }).limit(20);

    const keyId = serverEnv.RAZORPAY_KEY_ID;
    const keySecret = serverEnv.RAZORPAY_KEY_SECRET;

    for (const order of expiredOrders) {
      // Acquire 2-minute reclaimable lease lock
      const claimed: any = await OrderModel.findOneAndUpdate(
        {
          _id: (order as any)._id,
          orderStatus: 'open',
          $or: [{ sweepingUntil: { $exists: false } }, { sweepingUntil: { $lte: now } }],
        },
        { $set: { sweepingUntil: new Date(Date.now() + 2 * 60 * 1000) } },
        { new: true }
      );

      if (!claimed) continue;

      let hasCapturedPayment = false;
      let paymentIdFound: string | null = null;
      let lookupAmbiguous = false;

      // If Razorpay order exists, verify with Razorpay API
      if (claimed.razorpayOrderId && keyId && keySecret && !claimed.razorpayOrderId.startsWith('order_mock_')) {
        try {
          const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
          const res = await fetch(`https://api.razorpay.com/v1/orders/${claimed.razorpayOrderId}/payments`, {
            headers: { Authorization: `Basic ${basicAuth}` },
          });

          if (!res.ok) {
            console.warn(`[SWEEPER] Razorpay payments query returned ${res.status}. Skipping order ${claimed.id} safely.`);
            lookupAmbiguous = true;
          } else {
            const data = await res.json();
            const items = data.items || [];
            const captured = items.find((p: any) => p.status === 'captured');
            if (captured) {
              hasCapturedPayment = true;
              paymentIdFound = captured.id;
            }
          }
        } catch (fetchErr) {
          console.warn(`[SWEEPER] Error reaching Razorpay for order ${claimed.id}:`, fetchErr);
          lookupAmbiguous = true;
        }
      }

      // Safety rule: Never cancel on ambiguous lookup
      if (lookupAmbiguous) {
        claimed.sweepingUntil = undefined;
        await claimed.save();
        continue;
      }

      const items = (claimed.items || []).map((i: any) => ({
        variantId: i.variantId,
        sku: i.sku,
        quantity: i.quantity,
      }));

      if (hasCapturedPayment && paymentIdFound) {
        // Auto-apply captured payment (captured webhook was lost)
        await inventoryService.commitReservation(claimed.id, items);
        claimed.paymentStatus = 'paid';
        claimed.fulfilmentStatus = 'allocated';
        claimed.sweepingUntil = undefined;
        claimed.timeline.push({
          id: `ev_${Date.now()}_sweeper_paid`,
          status: 'allocated',
          description: `Captured payment (${paymentIdFound}) verified by Sweeper. Stock committed and queued for fulfillment.`,
          actor: 'System Sweeper Cron',
          createdAt: new Date().toISOString(),
        });
        await claimed.save();

        await jobService.enqueueJob('order_on_paid', { orderId: claimed.id, paymentId: paymentIdFound });
        autoAppliedCount++;
      } else {
        // Safe to cancel
        await inventoryService.releaseReservation(claimed.id, items);
        if (claimed.couponCode) {
          await couponService.releaseCoupon(claimed.couponCode, claimed.id).catch(() => null);
        }
        claimed.orderStatus = 'cancelled';
        claimed.paymentStatus = 'failed';
        claimed.sweepingUntil = undefined;
        claimed.timeline.push({
          id: `ev_${Date.now()}_sweeper_cancelled`,
          status: 'cancelled',
          description: 'Reservation expired without payment or COD confirmation. Stock hold released.',
          actor: 'System Sweeper Cron',
          createdAt: new Date().toISOString(),
        });
        await claimed.save();
        cancelledCount++;
      }
    }

    // 2. Recovery for stuck 'creating' shipments (> 10 minutes)
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuckShipments = await ShipmentModel.find({
      shippingSyncStatus: 'creating',
      updatedAt: { $lte: tenMinsAgo },
    });

    for (const s of stuckShipments) {
      s.shippingSyncStatus = 'sync_failed';
      s.needsAttention = true;
      s.needsAttentionReason = 'Shiprocket order creation timed out in creating state > 10m. Operations review required.';
      await s.save();
      recoveredShipmentCount++;

      await OrderModel.updateOne(
        { id: s.orderId },
        {
          $set: {
            needsAttention: true,
            needsAttentionReason: `Parcel box ${s.id} timed out during creation.`,
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      cancelledOrders: cancelledCount,
      autoAppliedOrders: autoAppliedCount,
      recoveredShipments: recoveredShipmentCount,
    });
  } catch (err: any) {
    console.error('[SWEEPER CRON ERROR]:', err);
    return NextResponse.json({ error: err.message || 'Sweeper failed' }, { status: 500 });
  }
}
