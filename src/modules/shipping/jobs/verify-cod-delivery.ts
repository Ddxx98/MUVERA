import { ShipmentModel, OrderModel } from '@/lib/models';
import { shiprocketClient } from '../providers/shiprocket/client';
import { auditService } from '@/modules/audit/service';

export async function verifyCodDeliveryJob(payload: { awb: string; orderId: string }): Promise<void> {
  const shipment = await ShipmentModel.findOne({ awb: payload.awb });
  if (!shipment || !shipment.cod.isCod) return;

  // 1. Authoritative check against carrier tracking API
  const trackRes = await shiprocketClient.trackAwb(payload.awb);
  const trackStatus = trackRes?.tracking_data?.current_status?.toUpperCase();

  // If carrier confirms delivery
  if (trackStatus === 'DELIVERED') {
    shipment.cod.collected = true;
    await shipment.save();

    // 2. Check if all COD shipments for this order are collected
    const allShipments = await ShipmentModel.find({ orderId: payload.orderId, direction: 'forward' });
    const allCollected = allShipments.every((s) => s.cod.collected);

    if (allCollected) {
      await OrderModel.updateOne(
        { _id: payload.orderId },
        {
          $set: {
            paymentStatus: 'paid',
            paidAt: new Date().toISOString(),
          },
        }
      );

      await auditService.recordAudit({
        action: 'COD_PAYMENT_VERIFIED_AND_PAID',
        entity: 'order',
        entityId: payload.orderId,
        actor: 'system_logistics',
        metadata: { awb: payload.awb },
      });
    }
  }
}
