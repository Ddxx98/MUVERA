import { NextResponse } from 'next/server';
import { jobService } from '@/modules/jobs';
import { db, connectToMongo } from '@/lib/db';
import { inventoryService } from '@/modules/inventory';
import { couponService } from '@/modules/coupons';
import { serverEnv } from '@/config/env.server';
import crypto from 'crypto';

export async function GET(
  req: Request,
  { params }: { params: { job: string } }
) {
  // Machine route: constant-time CRON_SECRET verification (no dev bypass)
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = serverEnv.CRON_SECRET;
  const expected = `Bearer ${cronSecret}`;

  // Constant-time comparison to prevent timing attacks
  const authBuf = Buffer.from(authHeader.padEnd(expected.length));
  const expectedBuf = Buffer.from(expected.padEnd(authHeader.length));
  const isValid = authBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(authBuf, expectedBuf) &&
    authHeader === expected;

  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobType = params.job;

  try {
    await connectToMongo();
    switch (jobType) {
      case 'recover-leases': {
        const recovered = await jobService.recoverExpiredLeases();
        return NextResponse.json({ success: true, recoveredCount: recovered });
      }

      case 'expire-reservations': {
        // Find orders whose 15-minute hold expired and payment was not completed
        const orders = await db.getOrders();
        const now = Date.now();
        const fifteenMinsMs = 15 * 60 * 1000;
        let expiredCount = 0;

        for (const order of orders) {
          if (
            order.orderStatus === 'open' &&
            order.fulfilmentStatus === 'unfulfilled' &&
            order.paymentStatus === 'pending_whatsapp'
          ) {
            const ageMs = now - new Date(order.createdAt).getTime();
            if (ageMs > fifteenMinsMs) {
              // Release reservation
              await inventoryService.releaseReservation(
                order.id,
                order.items.map((i) => ({ variantId: i.variantId, sku: i.sku, quantity: i.quantity }))
              );
              if (order.couponCode) {
                await couponService.releaseCoupon(order.couponCode, order.id);
              }
              order.orderStatus = 'cancelled';
              order.paymentStatus = 'failed';
              order.timeline.push({
                id: `ev_${Date.now()}_expired`,
                status: 'cancelled',
                description: 'Stock hold expired after 15 minutes without payment verification. Stock released.',
                actor: 'System Sweeper Cron',
                createdAt: new Date().toISOString(),
              });
              await db.saveOrder(order);
              expiredCount++;
            }
          }
        }

        return NextResponse.json({ success: true, expiredOrdersCount: expiredCount });
      }

      case 'reconcile-stock': {
        const inventory = await db.getInventory();
        let corrected = 0;

        for (const item of inventory) {
          const expectedAvailable = Math.max(0, item.onHand - item.reserved);
          if (item.available !== expectedAvailable) {
            item.available = expectedAvailable;
            item.updatedAt = new Date().toISOString();
            await db.saveInventoryItem(item);
            corrected++;
          }
        }

        return NextResponse.json({ success: true, correctedItemsCount: corrected });
      }

      case 'process-queue': {
        const job = await jobService.claimJob();
        if (!job) {
          return NextResponse.json({ success: true, message: 'No pending jobs in queue.' });
        }

        try {
          // Process job based on type
          if (job.type === 'expire_reservation') {
            const orderId = (job.payload as any).orderId;
            const order = await db.getOrderById(orderId);
            if (
              order &&
              order.orderStatus === 'open' &&
              order.fulfilmentStatus === 'unfulfilled' &&
              order.paymentStatus === 'pending_whatsapp'
            ) {
              await inventoryService.releaseReservation(
                order.id,
                order.items.map((i) => ({ variantId: i.variantId, sku: i.sku, quantity: i.quantity }))
              );
              order.orderStatus = 'cancelled';
              await db.saveOrder(order);
            }
          } else if (job.type === 'process_logistics_event') {
            const { processLogisticsEventJob } = await import('@/modules/shipping/jobs/process-logistics-event');
            await processLogisticsEventJob(job.payload as any);
          } else if (job.type === 'fulfill_shipment') {
            const { fulfillShipmentJob } = await import('@/modules/shipping/jobs/fulfill-shipment');
            await fulfillShipmentJob(job.payload as any);
          } else if (job.type === 'assign_awb') {
            const { assignAwbJob } = await import('@/modules/shipping/jobs/assign-awb');
            await assignAwbJob(job.payload as any);
          } else if (job.type === 'cancel_shipment') {
            const { cancelShipmentJob } = await import('@/modules/shipping/jobs/cancel-shipment');
            await cancelShipmentJob(job.payload as any);
          } else if (job.type === 'order_on_paid') {
            const { orderOnPaidJob } = await import('@/modules/orders/jobs/order-on-paid');
            await orderOnPaidJob(job.payload as any);
          } else if (job.type === 'order_on_confirmed') {
            const { orderOnConfirmedJob } = await import('@/modules/orders/jobs/order-on-confirmed');
            await orderOnConfirmedJob(job.payload as any);
          } else if (job.type === 'process_refund') {
            const { processRefundJob } = await import('@/modules/payments/jobs/process-refund');
            await processRefundJob(job.payload as any);
          } else if (job.type === 'verify_cod_delivery') {
            const { verifyCodDeliveryJob } = await import('@/modules/shipping/jobs/verify-cod-delivery');
            await verifyCodDeliveryJob(job.payload as any);
          }

          await jobService.completeJob(job._id.toString());
          return NextResponse.json({ success: true, completedJobId: job._id });
        } catch (jobErr) {
          await jobService.failJob(
            job._id.toString(),
            job.attempts,
            job.maxAttempts,
            jobErr
          );
          return NextResponse.json({ success: false, error: String(jobErr) }, { status: 500 });
        }
      }

      case 'sweep-logistics': {
        const { sweepStuckLogisticsEvents } = await import('@/modules/shipping/jobs/process-logistics-event');
        const count = await sweepStuckLogisticsEvents();
        return NextResponse.json({ success: true, reEnqueuedCount: count });
      }

      default:
        return NextResponse.json({ error: `Unknown cron job: ${jobType}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Cron execution failed' }, { status: 500 });
  }
}
