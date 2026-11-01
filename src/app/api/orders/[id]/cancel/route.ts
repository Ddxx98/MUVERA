import { NextResponse } from 'next/server';
import { connectToMongo } from '@/lib/db';
import { OrderModel } from '@/lib/models/Order';
import { ShipmentModel } from '@/lib/models/Shipment';
import { RefundModel } from '@/lib/models/Refund';
import { getOptionalUser } from '@/modules/auth/guards';
import { inventoryService } from '@/modules/inventory';
import { couponService } from '@/modules/coupons';
import { jobService } from '@/modules/jobs';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToMongo();
    const ctx = await getOptionalUser();
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Customer requested cancellation';

    const orderId = params.id;
    const order = await OrderModel.findOne({
      $or: [{ id: orderId }, { orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Customer ownership verification
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

    if (order.orderStatus === 'cancelled') {
      return NextResponse.json({ success: true, message: 'Order is already cancelled' });
    }

    // Inspect shipments
    const shipments = await ShipmentModel.find({ orderId: order.id, direction: 'forward' });
    const pickedUpStatuses = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
    const hasPickedUp = shipments.some((s) => pickedUpStatuses.includes(s.status));

    if (hasPickedUp) {
      return NextResponse.json(
        {
          error:
            'Order has already been picked up by courier and cannot be cancelled directly. Please initiate a return upon delivery.',
        },
        { status: 400 }
      );
    }

    // Check if shipments have been synced to Shiprocket
    const hasActiveExternalShipments = shipments.some(
      (s) => s.shippingSyncStatus === 'synced' || s.srOrderId || s.srShipmentId || s.awbStatus === 'assigned'
    );

    if (hasActiveExternalShipments) {
      // Transition to cancel_pending and enqueue cancel_shipment job
      order.orderStatus = 'cancel_pending';
      order.timeline.push({
        id: `ev_${Date.now()}_cancel_pending`,
        status: 'cancel_pending' as any,
        description: `Cancellation requested (${reason}). Awaiting courier clearance.`,
        actor: ctx?.role === 'admin' ? `Admin (${ctx.name || ctx.email})` : 'Customer',
        createdAt: new Date().toISOString(),
      });
      await order.save();

      for (const s of shipments) {
        s.cancellationStatus = 'pending';
        await s.save();
      }

      await jobService.enqueueJob(
        'cancel_shipment',
        { orderId: order.id, reason },
        { dedupeKey: `cancel_shipment_${order.id}` }
      );

      return NextResponse.json({
        success: true,
        message: 'Cancellation request received and pending courier cancellation.',
        orderStatus: 'cancel_pending',
      });
    }

    // Pre-Shipment Cancellation Path
    const items = order.items.map((i: any) => ({
      variantId: i.variantId,
      sku: i.sku,
      quantity: i.quantity,
    }));

    if (order.fulfilmentStatus === 'packed') {
      // Warehouse unpacking gate: physical items remain in carton until checked back
      order.orderStatus = 'cancelled';
      order.requiresUnpacking = true;
      order.timeline.push({
        id: `ev_${Date.now()}_cancelled_unpacking`,
        status: 'cancelled',
        description: `Order cancelled after packing (${reason}). Marked for warehouse unpacking.`,
        actor: ctx?.role === 'admin' ? `Admin (${ctx.name || ctx.email})` : 'Customer',
        createdAt: new Date().toISOString(),
      });
    } else if (order.fulfilmentStatus === 'allocated') {
      // Stock was committed: perform cancelRestock
      await inventoryService.cancelRestock(
        order.id,
        items,
        'loc_blr_ind_01',
        ctx?.role === 'admin' ? 'Admin Cancellation' : 'Customer Cancellation'
      );
      order.orderStatus = 'cancelled';
      order.fulfilmentStatus = 'cancelled';
      order.timeline.push({
        id: `ev_${Date.now()}_cancelled_restocked`,
        status: 'cancelled',
        description: `Order cancelled (${reason}). Stock restored to on-hand inventory.`,
        actor: ctx?.role === 'admin' ? `Admin (${ctx.name || ctx.email})` : 'Customer',
        createdAt: new Date().toISOString(),
      });
    } else {
      // Stock was in reservation hold (unfulfilled): release reservation
      await inventoryService.releaseReservation(order.id, items);
      order.orderStatus = 'cancelled';
      order.fulfilmentStatus = 'cancelled';
      order.timeline.push({
        id: `ev_${Date.now()}_cancelled`,
        status: 'cancelled',
        description: `Order cancelled (${reason}). Stock hold released.`,
        actor: ctx?.role === 'admin' ? `Admin (${ctx.name || ctx.email})` : 'Customer',
        createdAt: new Date().toISOString(),
      });
    }

    // Release coupon if attached
    if (order.couponCode) {
      await couponService.releaseCoupon(order.couponCode, order.id).catch(() => null);
    }

    // Trigger refund if order was paid
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

    await order.save();

    return NextResponse.json({
      success: true,
      message: 'Order successfully cancelled.',
      order: {
        id: order.id,
        orderStatus: order.orderStatus,
        fulfilmentStatus: order.fulfilmentStatus,
        paymentStatus: order.paymentStatus,
        requiresUnpacking: order.requiresUnpacking,
      },
    });
  } catch (err: any) {
    console.error('Order cancellation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to cancel order' }, { status: 500 });
  }
}
