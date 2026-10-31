import { OrderModel, ShipmentModel } from '@/lib/models';
import { shiprocketClient } from '../providers/shiprocket/client';
import { planOrderPackaging, sanitizeAddressLines } from '../box-packer';
import { locationService } from '@/modules/locations/service';
import { auditService } from '@/modules/audit/service';

export async function fulfillShipmentJob(payload: { orderId: string }): Promise<void> {
  const order = await OrderModel.findById(payload.orderId);
  if (!order) throw new Error(`Order ${payload.orderId} not found`);

  if (order.fulfilmentStatus !== 'packed') {
    return; // Only dispatch shipments once packed
  }

  // 1. Resolve dark store origin location
  const mainLocation = await locationService.getLocationByCode('MAIN_WAREHOUSE').catch(() => null);
  const pickupLocationName = mainLocation?.code || 'MAIN_WAREHOUSE';

  // 2. Check if shipments already exist for this order
  let existingShipments = await ShipmentModel.find({ orderId: order.id, direction: 'forward' });

  // If no shipments exist, calculate packaging and create them
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

  // 3. Process fulfillment steps for each shipment
  const sanitizedAddr = sanitizeAddressLines(order.shippingAddress?.street || '1st Main');

  for (const shipment of existingShipments) {
    // Step 1: Create Order in Shiprocket
    let srShipmentId = (shipment as any).srShipmentId;
    if (!srShipmentId) {
      const srRes = await shiprocketClient.createAdhocOrder({
        order_id: `${order.orderNo}_${shipment.id}`,
        order_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        pickup_location: pickupLocationName,
        billing_customer_name: order.customerName || 'Customer',
        billing_address: sanitizedAddr.line1,
        billing_address_2: sanitizedAddr.line2 || '',
        billing_city: order.shippingAddress?.city || 'Bengaluru',
        billing_pincode: order.shippingAddress?.pincode || '560001',
        billing_state: order.shippingAddress?.state || 'Karnataka',
        billing_country: 'India',
        billing_email: order.customerEmail || 'support@muvera.in',
        billing_phone: order.customerPhone || '9999999999',
        shipping_is_billing: true,
        order_items: (order.items || []).map((it: any) => ({
          name: it.productName || 'Apparel Item',
          sku: it.variantId || 'SKU_APP',
          units: it.quantity,
          selling_price: Math.round((it.sellingPricePaise || 0) / 100),
        })),
        payment_method: shipment.cod.isCod ? 'COD' : 'Prepaid',
        sub_total: Math.round((order.totalPaise || 0) / 100),
        length: shipment.dimensions.lengthCm,
        breadth: shipment.dimensions.breadthCm,
        height: shipment.dimensions.heightCm,
        weight: shipment.deadWeightKg,
      });

      srShipmentId = srRes.shipment_id;
      (shipment as any).srShipmentId = srShipmentId;
      await ShipmentModel.updateOne({ _id: shipment.id }, { $set: { srShipmentId } });
    }

    // Step 2: Assign AWB
    if (shipment.awb.startsWith('PENDING_')) {
      const awbRes = await shiprocketClient.assignAwb(srShipmentId);
      shipment.awb = awbRes.awb_code;
      shipment.courierName = awbRes.courier_name;
      shipment.status = 'manifested';
      await ShipmentModel.updateOne(
        { _id: shipment.id },
        {
          $set: {
            awb: awbRes.awb_code,
            courierName: awbRes.courier_name,
            status: 'manifested',
          },
        }
      );
    }

    // Step 3: Schedule Pickup
    if (!(shipment as any).pickupScheduled) {
      await shiprocketClient.schedulePickup(srShipmentId);
      await ShipmentModel.updateOne({ _id: shipment.id }, { $set: { pickupScheduled: true } });
    }

    // Step 4: Generate Label
    if (!(shipment as any).labelUrl) {
      const labelRes = await shiprocketClient.generateLabel(srShipmentId);
      await ShipmentModel.updateOne(
        { _id: shipment.id },
        { $set: { labelUrl: labelRes.label_url } }
      );
    }
  }

  await auditService.recordAudit({
    action: 'FULFILL_SHIPMENT_DISPATCHED',
    entity: 'order',
    entityId: order.id,
    actor: 'system_logistics',
    metadata: { orderId: order.id, shipmentCount: existingShipments.length },
  });
}
