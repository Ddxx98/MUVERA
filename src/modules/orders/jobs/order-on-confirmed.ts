import { connectToMongo } from '@/lib/db';
import { OrderModel } from '@/lib/models/Order';
import { notificationService } from '@/modules/notifications/service';
import { jobService } from '@/modules/jobs';
import { auditService } from '@/modules/audit/service';

export async function orderOnConfirmedJob(payload: { orderId: string }): Promise<void> {
  await connectToMongo();
  const order = await OrderModel.findOne({
    $or: [{ id: payload.orderId }, { orderId: payload.orderId }, { _id: payload.orderId.match(/^[0-9a-fA-F]{24}$/) ? payload.orderId : null }],
  });

  if (!order) {
    throw new Error(`Order ${payload.orderId} not found in orderOnConfirmedJob`);
  }

  // Idempotently dispatch confirmation email
  try {
    await notificationService.sendOrderConfirmationEmail(order);
  } catch (emailErr) {
    console.warn(`[ORDER_ON_CONFIRMED] Email send failed for order ${order.id}:`, emailErr);
  }

  // Enqueue fulfillment job to create Shiprocket parcel orders
  await jobService.enqueueJob(
    'fulfill_shipment',
    { orderId: order.id },
    { dedupeKey: `fulfill_shipment_${order.id}` }
  );

  await auditService.recordAudit({
    action: 'ORDER_COD_CONFIRMED_PROCESSED',
    entity: 'order',
    entityId: order.id,
    actor: 'system_orders',
    metadata: {
      orderId: order.id,
      paymentPreference: order.paymentPreference,
      totalPaise: order.totalPaise,
    },
  });
}
