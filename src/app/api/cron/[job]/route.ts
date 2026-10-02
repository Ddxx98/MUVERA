import { NextResponse } from 'next/server';
import { jobService } from '@/modules/jobs';
import { db } from '@/lib/db';
import { inventoryService } from '@/modules/inventory';
import { couponService } from '@/modules/coupons';
import { serverEnv } from '@/config/env.server';

export async function GET(
  req: Request,
  { params }: { params: { job: string } }
) {
  // Authorization check (Bearer token matching CRON_SECRET or dev bypass)
  const authHeader = req.headers.get('authorization');
  const cronSecret = serverEnv.CRON_SECRET;

  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobType = params.job;

  try {
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

      default:
        return NextResponse.json({ error: `Unknown cron job: ${jobType}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Cron execution failed' }, { status: 500 });
  }
}
