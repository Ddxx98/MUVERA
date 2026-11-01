import { NextResponse } from 'next/server';
import { connectToMongo } from '@/lib/db';
import { OrderModel, ShipmentModel } from '@/lib/models';
import { requireAdmin } from '@/modules/auth/guards';
import { jobService } from '@/modules/jobs';
import { auditService } from '@/modules/audit/service';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToMongo();
    const admin = await requireAdmin();

    const orderId = params.id;
    const order = await OrderModel.findOne({
      $or: [{ id: orderId }, { orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.orderStatus === 'cancelled' || order.orderStatus === 'cancel_pending') {
      return NextResponse.json(
        { error: `Cannot pack order in '${order.orderStatus}' status.` },
        { status: 400 }
      );
    }

    // Verify all shipments are synced to Shiprocket
    const shipments = await ShipmentModel.find({ orderId: order.id, direction: 'forward' });
    if (shipments.length === 0) {
      return NextResponse.json(
        { error: 'No forward shipments found for this order. Please initiate fulfillment first.' },
        { status: 400 }
      );
    }

    const unsynced = shipments.filter((s) => s.shippingSyncStatus !== 'synced');
    if (unsynced.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot pack order. ${unsynced.length} parcel(s) are not yet synced with Shiprocket. Resolve failed syncs first.`,
        },
        { status: 400 }
      );
    }

    // Unified statutory invoice timing: Assign invoice number at packing
    if (!order.invoiceNo) {
      const year = new Date().getFullYear();
      order.invoiceNo = `INV-${year}-${order.orderNo || order.id.slice(-6)}`;
    }

    order.fulfilmentStatus = 'packed';
    order.timeline.push({
      id: `ev_${Date.now()}_packed`,
      status: 'packed',
      description: `Order packed into ${shipments.length} carton(s). Invoice #${order.invoiceNo} issued. Queued for AWB generation and pickup.`,
      actor: `Admin (${admin.user.name || admin.user.email})`,
      createdAt: new Date().toISOString(),
    });
    await order.save();

    // Enqueue assign_awb background job
    await jobService.enqueueJob(
      'assign_awb',
      { orderId: order.id },
      { dedupeKey: `assign_awb_${order.id}` }
    );

    await auditService.recordAudit({
      action: 'ORDER_PACKED',
      entity: 'order',
      entityId: order.id,
      actor: `admin:${admin.user.email}`,
      metadata: {
        orderId: order.id,
        invoiceNo: order.invoiceNo,
        shipmentCount: shipments.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Order packed successfully. AWB assignment and pickup scheduled.',
      order: {
        id: order.id,
        orderNo: order.orderNo,
        fulfilmentStatus: order.fulfilmentStatus,
        invoiceNo: order.invoiceNo,
      },
    });
  } catch (err: any) {
    console.error('Admin pack order error:', err);
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Failed to pack order' }, { status });
  }
}
