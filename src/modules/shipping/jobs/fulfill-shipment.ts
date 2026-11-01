import { OrderModel, ShipmentModel } from '@/lib/models';
import { shiprocketClient } from '../providers/shiprocket/client';
import { planOrderPackaging, sanitizeAddressLines } from '../box-packer';
import { auditService } from '@/modules/audit/service';
import { connectToMongo } from '@/lib/db';

export async function fulfillShipmentJob(payload: { orderId: string }): Promise<void> {
  await connectToMongo();
  const order = await OrderModel.findOne({
    $or: [{ id: payload.orderId }, { orderId: payload.orderId }, { _id: payload.orderId.match(/^[0-9a-fA-F]{24}$/) ? payload.orderId : null }],
  });
  if (!order) throw new Error(`Order ${payload.orderId} not found in fulfillShipmentJob`);

  if (order.orderStatus === 'cancelled') {
    console.warn(`[FULFILL_SHIPMENT] Order ${order.id} is cancelled. Skipping fulfillment.`);
    return;
  }

  // Live verified pickup location
  const pickupLocationName = 'Abhi';

  // Find or initialize shipments
  let existingShipments = await ShipmentModel.find({ orderId: order.id, direction: 'forward' });

  if (existingShipments.length === 0) {
    const packagingItems = (order.items || []).map((item: any) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      unitWeightKg: 0.4,
      unitLengthCm: 25,
      unitBreadthCm: 20,
      unitHeightCm: 3,
    }));

    const parcelPlans = planOrderPackaging(packagingItems);
    const isCod = order.paymentPreference === 'cod' || order.paymentPreference === 'cod_whatsapp';
    const totalAmountPaise = order.totalPaise || 0;

    for (let i = 0; i < parcelPlans.length; i++) {
      const plan = parcelPlans[i];
      // Allocate COD per parcel (for multi-parcel orders, allocate remaining to last parcel)
      const parcelCodPaise = isCod
        ? i === parcelPlans.length - 1
          ? totalAmountPaise - Math.floor(totalAmountPaise / parcelPlans.length) * (parcelPlans.length - 1)
          : Math.floor(totalAmountPaise / parcelPlans.length)
        : 0;

      const created = await ShipmentModel.create({
        orderId: order.id,
        orderNo: order.orderNo,
        direction: 'forward',
        awb: `PENDING_${order.orderNo}_${i + 1}`,
        courierName: 'Shiprocket',
        status: 'created',
        shippingSyncStatus: 'not_synced',
        dimensions: {
          lengthCm: plan.box.lengthCm,
          breadthCm: plan.box.breadthCm,
          heightCm: plan.box.heightCm,
        },
        deadWeightKg: plan.deadWeightKg,
        cod: {
          isCod,
          amountPaise: parcelCodPaise,
          collected: false,
          remitted: false,
        },
      });
      existingShipments.push(created);
    }
  }

  const rawName = (order.customerName || order.shippingAddress?.fullName || 'Customer').trim();
  const nameParts = rawName.split(/\s+/);
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || firstName;
  const sanitizedAddr = sanitizeAddressLines(order.shippingAddress?.street || 'Indiranagar');

  let hasAnyFailure = false;
  let allSynced = true;

  // Process shipments independently for multi-box resilience
  for (const shipment of existingShipments) {
    if (shipment.shippingSyncStatus === 'synced' && shipment.srOrderId) {
      continue; // Already created in Shiprocket
    }

    try {
      // Mark creating status
      shipment.shippingSyncStatus = 'creating';
      await shipment.save();

      const channelOrderId = `${order.orderNo}_${shipment.id}`;
      const isCod = shipment.cod?.isCod ?? false;
      const subTotalRupees = Number(((order.totalPaise || 0) / 100).toFixed(2));

      const srRes = await shiprocketClient.createAdhocOrder({
        order_id: channelOrderId,
        order_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        pickup_location: pickupLocationName,
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address: sanitizedAddr.line1,
        billing_address_2: sanitizedAddr.line2 || '',
        billing_city: order.shippingAddress?.city || 'Bengaluru',
        billing_pincode: order.shippingAddress?.pincode || '560038',
        billing_state: order.shippingAddress?.state || 'Karnataka',
        billing_country: 'India',
        billing_email: order.customerEmail || 'support@muvera.in',
        billing_phone: order.customerPhone || '9999999999',
        shipping_is_billing: true,
        order_items: (order.items || []).map((it: any) => ({
          name: it.productName || 'Apparel Item',
          sku: it.variantId || 'SKU_APP',
          units: it.quantity,
          selling_price: Number(((it.sellingPricePaise || order.totalPaise) / (100 * (it.quantity || 1))).toFixed(2)),
        })),
        payment_method: isCod ? 'COD' : 'Prepaid',
        sub_total: subTotalRupees,
        length: shipment.dimensions.lengthCm,
        breadth: shipment.dimensions.breadthCm,
        height: shipment.dimensions.heightCm,
        weight: shipment.deadWeightKg,
      });

      shipment.srOrderId = String(srRes.order_id);
      shipment.srShipmentId = srRes.shipment_id;
      shipment.channelOrderId = channelOrderId;
      shipment.shippingSyncStatus = 'synced';
      shipment.needsAttention = false;
      shipment.needsAttentionReason = undefined;
      await shipment.save();
    } catch (err: any) {
      console.error(`[FULFILL_SHIPMENT] Box creation failed for shipment ${shipment.id}:`, err);
      hasAnyFailure = true;
      allSynced = false;

      shipment.shippingSyncStatus = 'sync_failed';
      shipment.needsAttention = true;
      shipment.needsAttentionReason = `Shiprocket creation failed: ${err.message}`;
      await shipment.save();
    }
  }

  // Update overall order sync status
  if (allSynced && !hasAnyFailure) {
    order.shippingSyncStatus = 'synced';
  } else if (hasAnyFailure) {
    order.shippingSyncStatus = 'sync_failed';
    order.needsAttention = true;
    order.needsAttentionReason = 'One or more parcel boxes failed to sync with Shiprocket. Operations review required.';
  }
  await order.save();

  await auditService.recordAudit({
    action: 'FULFILL_SHIPMENT_SYNCED',
    entity: 'order',
    entityId: order.id,
    actor: 'system_logistics',
    metadata: {
      orderId: order.id,
      shipmentCount: existingShipments.length,
      allSynced,
      hasAnyFailure,
    },
  });
}
