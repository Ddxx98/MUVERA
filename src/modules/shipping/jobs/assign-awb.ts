import { connectToMongo } from '@/lib/db';
import { OrderModel, ShipmentModel, SiteSettingsModel } from '@/lib/models';
import { shiprocketClient } from '../providers/shiprocket/client';
import { auditService } from '@/modules/audit/service';

export async function assignAwbJob(payload: { orderId: string }): Promise<void> {
  await connectToMongo();
  const order = await OrderModel.findOne({
    $or: [{ id: payload.orderId }, { orderId: payload.orderId }, { _id: payload.orderId.match(/^[0-9a-fA-F]{24}$/) ? payload.orderId : null }],
  });

  if (!order) throw new Error(`Order ${payload.orderId} not found in assignAwbJob`);

  const shipments = await ShipmentModel.find({ orderId: order.id, direction: 'forward' });
  if (shipments.length === 0) {
    throw new Error(`No shipments found for order ${order.id} in assignAwbJob`);
  }

  // Load site settings for courier strategy
  const settings = await SiteSettingsModel.findOne().lean().catch(() => null);
  const strategy = (settings as any)?.courierSelectionStrategy || 'cheapest';

  let hasAnyFailure = false;

  for (const shipment of shipments) {
    if (!shipment.srShipmentId) {
      console.warn(`[ASSIGN_AWB] Shipment ${shipment.id} does not have srShipmentId yet. Skipping.`);
      continue;
    }

    try {
      // Step 1: Assign AWB if not yet assigned
      if (shipment.awbStatus !== 'assigned' || shipment.awb.startsWith('PENDING_')) {
        const awbRes = await shiprocketClient.assignAwb(shipment.srShipmentId);
        shipment.awb = awbRes.awb_code;
        shipment.courierName = awbRes.courier_name;
        shipment.awbStatus = 'assigned';
        shipment.status = 'manifested';
        await shipment.save();
      }

      // Step 2: Schedule Pickup if not yet scheduled
      if (!shipment.pickupScheduled) {
        await shiprocketClient.schedulePickup(shipment.srShipmentId);
        shipment.pickupScheduled = true;
        await shipment.save();
      }

      // Step 3: Generate Thermal Shipping Label if not yet generated
      if (!shipment.labelGenerated || !shipment.labelUrl) {
        const labelRes = await shiprocketClient.generateLabel(shipment.srShipmentId);
        shipment.labelUrl = labelRes.label_url;
        shipment.labelGenerated = true;
        await shipment.save();
      }
    } catch (err: any) {
      console.error(`[ASSIGN_AWB] Failed processing shipment ${shipment.id}:`, err);
      hasAnyFailure = true;
      shipment.awbStatus = 'failed';
      shipment.needsAttention = true;
      shipment.needsAttentionReason = `AWB generation / pickup scheduling failed: ${err.message}`;
      await shipment.save();

      order.needsAttention = true;
      order.needsAttentionReason = `AWB generation failed on parcel ${shipment.id}: ${err.message}`;
      await order.save();
    }
  }

  // If all shipments have tracking numbers, record tracking on order
  const allAssigned = shipments.every((s) => s.awbStatus === 'assigned' && !s.awb.startsWith('PENDING_'));
  if (allAssigned && !hasAnyFailure) {
    order.trackingNumber = shipments.map((s) => s.awb).join(', ');
    order.needsAttention = false;
    order.needsAttentionReason = undefined;
    order.timeline.push({
      id: `ev_${Date.now()}_awb_assigned`,
      status: 'packed',
      description: `AWB and shipping labels generated: ${order.trackingNumber}. Pickup scheduled.`,
      actor: 'Shiprocket Logistics Engine',
      createdAt: new Date().toISOString(),
    });
    await order.save();
  }

  await auditService.recordAudit({
    action: 'AWB_ASSIGNMENT_EXECUTED',
    entity: 'order',
    entityId: order.id,
    actor: 'system_logistics',
    metadata: {
      orderId: order.id,
      shipmentCount: shipments.length,
      allAssigned,
      hasAnyFailure,
      strategy,
    },
  });
}
