import { connectToMongo } from '@/lib/db';
import { OrderModel, ShipmentModel, RefundModel } from '@/lib/models';
import { shiprocketClient } from '../providers/shiprocket/client';
import { inventoryService } from '@/modules/inventory';
import { couponService } from '@/modules/coupons';
import { jobService } from '@/modules/jobs';
import { auditService } from '@/modules/audit/service';

export async function cancelShipmentJob(payload: { orderId: string; reason?: string }): Promise<void> {
  await connectToMongo();
  const order = await OrderModel.findOne({
    $or: [{ id: payload.orderId }, { orderId: payload.orderId }, { _id: payload.orderId.match(/^[0-9a-fA-F]{24}$/) ? payload.orderId : null }],
  });

  if (!order) throw new Error(`Order ${payload.orderId} not found in cancelShipmentJob`);

  const shipments = await ShipmentModel.find({ orderId: order.id, direction: 'forward' });
  let hasAnyRefused = false;
  let allCancelled = true;

  for (const shipment of shipments) {
    if (shipment.cancellationStatus === 'cancelled') {
      continue;
    }

    try {
      if (shipment.srOrderId) {
        await shiprocketClient.cancelOrder([Number(shipment.srOrderId)]);
      }

      if (shipment.awb && !shipment.awb.startsWith('PENDING_')) {
        await shiprocketClient.cancelAwb([shipment.awb]);
      }

      shipment.cancellationStatus = 'cancelled';
      shipment.status = 'cancelled';
      shipment.needsAttention = false;
      shipment.needsAttentionReason = undefined;
      await shipment.save();
    } catch (err: any) {
      console.error(`[CANCEL_SHIPMENT] Courier refused cancellation for shipment ${shipment.id}:`, err);
      hasAnyRefused = true;
      allCancelled = false;
      shipment.cancellationStatus = 'refused';
      shipment.needsAttention = true;
      shipment.needsAttentionReason = `Courier refused cancellation: ${err.message}`;
      await shipment.save();
    }
  }

  const items = order.items.map((i: any) => ({
    variantId: i.variantId,
    sku: i.sku,
    quantity: i.quantity,
  }));

  if (allCancelled && !hasAnyRefused) {
    // All shipments successfully cancelled
    if (order.fulfilmentStatus === 'packed') {
      order.orderStatus = 'cancelled';
      order.requiresUnpacking = true;
      order.timeline.push({
        id: `ev_${Date.now()}_cancel_success_unpack`,
        status: 'cancelled',
        description: `Shiprocket shipments cancelled. Parcel marked for warehouse unpacking.`,
        actor: 'Shiprocket Cancellation Job',
        createdAt: new Date().toISOString(),
      });
    } else {
      await inventoryService.cancelRestock(
        order.id,
        items,
        'loc_blr_ind_01',
        'Shiprocket Parcel Cancellation'
      );
      order.orderStatus = 'cancelled';
      order.fulfilmentStatus = 'cancelled';
      order.timeline.push({
        id: `ev_${Date.now()}_cancel_success`,
        status: 'cancelled',
        description: `All Shiprocket shipments cancelled. Stock restored to available inventory.`,
        actor: 'Shiprocket Cancellation Job',
        createdAt: new Date().toISOString(),
      });
    }

    if (order.couponCode) {
      await couponService.releaseCoupon(order.couponCode, order.id).catch(() => null);
    }

    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refund_pending';
      const paymentId = order.razorpayOrderId || `pay_order_${order.id}`;

      await RefundModel.create({
        orderId: order.id,
        orderNo: order.orderNo,
        paymentId,
        amountPaise: order.totalPaise,
        reason: 'order_cancelled',
        sourceId: order.id,
        idempotencyKey: `${paymentId}:order_cancelled:${order.id}`,
        status: 'pending',
      }).catch((e) => console.warn('Refund record duplicate or insert error:', e));

      await jobService.enqueueJob('process_refund', {
        paymentId,
        amountPaise: order.totalPaise,
        orderId: order.id,
        reason: 'order_cancelled',
      });
    }

    order.needsAttention = false;
    order.needsAttentionReason = undefined;
  } else {
    // Partial refusal: keep in cancel_pending and flag needsAttention
    order.orderStatus = 'cancel_pending';
    order.needsAttention = true;
    order.needsAttentionReason =
      'One or more parcel boxes were refused cancellation by courier. Operations team manual action required.';
    order.timeline.push({
      id: `ev_${Date.now()}_cancel_partial_refused`,
      status: 'cancel_pending' as any,
      description: `Courier refused cancellation on one or more parcels. Flagged for Operations Attention.`,
      actor: 'Shiprocket Cancellation Job',
      createdAt: new Date().toISOString(),
    });
  }

  await order.save();

  await auditService.recordAudit({
    action: 'CANCEL_SHIPMENT_EXECUTED',
    entity: 'order',
    entityId: order.id,
    actor: 'system_logistics',
    metadata: {
      orderId: order.id,
      allCancelled,
      hasAnyRefused,
      shipmentCount: shipments.length,
    },
  });
}
