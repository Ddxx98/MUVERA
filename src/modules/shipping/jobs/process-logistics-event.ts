import { WebhookEventModel, ShipmentModel, ShipmentScanModel, OrderModel, ReturnModel } from '@/lib/models';
import {
  FORWARD_STATUS_MAP,
  RETURN_STATUS_MAP,
  normalizeStatusLabel,
  parseShiprocketDate,
  getAllowedPredecessors,
} from '../state-machine';
import { jobService } from '@/modules/jobs';

export async function processLogisticsEventJob(payload: { eventKey: string }): Promise<void> {
  const event = await WebhookEventModel.findOneAndUpdate(
    { source: 'shiprocket', eventKey: payload.eventKey, status: { $in: ['received', 'failed'] } },
    { $set: { status: 'processing' } },
    { new: true }
  );

  if (!event) return;

  try {
    const rawPayload = event.payload;
    const awb = (rawPayload.awb || '').trim();

    // 1. Unknown AWB lookup
    const shipment = await ShipmentModel.findOne({ awb });
    if (!shipment) {
      await WebhookEventModel.updateOne({ _id: event._id }, { $set: { status: 'unknown_awb' } });
      return;
    }

    // 2. Coerce is_return explicitly
    const rawIsReturn = rawPayload.is_return;
    const isReturn = rawIsReturn === 1 || rawIsReturn === '1' || rawIsReturn === true;

    // Check direction mismatch
    if ((isReturn && shipment.direction !== 'return') || (!isReturn && shipment.direction === 'return')) {
      await WebhookEventModel.updateOne({ _id: event._id }, { $set: { status: 'direction_mismatch' } });
      return;
    }

    // 3. Status mapping from verified dictionary
    const statusMap = isReturn ? RETURN_STATUS_MAP : FORWARD_STATUS_MAP;
    const rawStatusLabel = normalizeStatusLabel(rawPayload.current_status || rawPayload.shipment_status);
    const mapping = statusMap[rawStatusLabel];

    if (!mapping) {
      await WebhookEventModel.updateOne(
        { _id: event._id },
        { $set: { status: 'unmapped', unmappedStatus: rawStatusLabel } }
      );
      return;
    }

    // 4. Scans bulkWrite (ignore ONLY error 11000 duplicate keys)
    const rawScans = Array.isArray(rawPayload.scans) ? rawPayload.scans : [];
    let latestScanDate: Date | null = null;
    let latestScanLocation: string | undefined = undefined;

    const parsedScans = rawScans.map((s: any) => {
      const scanDate = parseShiprocketDate(s.date);
      if (!latestScanDate || scanDate > latestScanDate) {
        latestScanDate = scanDate;
        latestScanLocation = (s.location || '').trim();
      }
      return {
        awb,
        timestamp: scanDate,
        status: normalizeStatusLabel(s.activity || s.status),
        location: (s.location || '').trim(),
        activity: s.activity || s.status || '',
        srStatusId: s['sr-status'] ? Number(s['sr-status']) : undefined,
        raw: s,
        createdAt: new Date(),
      };
    });

    if (parsedScans.length > 0) {
      const operations = parsedScans.map((scan: any) => ({
        updateOne: {
          filter: { awb: scan.awb, timestamp: scan.timestamp, status: scan.status, location: scan.location },
          update: { $setOnInsert: scan },
          upsert: true,
        },
      }));

      try {
        await ShipmentScanModel.bulkWrite(operations, { ordered: false });
      } catch (err: any) {
        // Only ignore duplicate key error 11000
        const isDuplicateKey = err?.code === 11000 || (err?.writeErrors && err.writeErrors.every((we: any) => we.code === 11000));
        if (!isDuplicateKey) {
          throw err;
        }
      }
    }

    const eventDate = rawPayload.current_timestamp
      ? parseShiprocketDate(rawPayload.current_timestamp)
      : latestScanDate || new Date();

    // 5. Informational scan check (e.g. DELAYED or RTO ACKNOWLEDGED)
    if (mapping.isInformational) {
      if (latestScanLocation) {
        await ShipmentModel.updateOne({ awb }, { $set: { lastScanLocation: latestScanLocation } });
      }
      await WebhookEventModel.updateOne({ _id: event._id }, { $set: { status: 'informational' } });
      return;
    }

    // 6. Same-status check
    if (shipment.status === mapping.status) {
      if (latestScanLocation) {
        await ShipmentModel.updateOne({ awb }, { $set: { lastScanLocation: latestScanLocation } });
      }
      await WebhookEventModel.updateOne({ _id: event._id }, { $set: { status: 'ignored_same_state' } });
      return;
    }

    // 7. Stale timestamp check
    if (shipment.lastStatusTimestamp && eventDate < shipment.lastStatusTimestamp) {
      await WebhookEventModel.updateOne({ _id: event._id }, { $set: { status: 'rejected_stale' } });
      return;
    }

    // 8. Atomic transition via findOneAndUpdate
    const allowed = getAllowedPredecessors(mapping.status);
    const updated = await ShipmentModel.findOneAndUpdate(
      {
        awb,
        status: { $in: allowed },
        $or: [{ lastStatusTimestamp: null }, { lastStatusTimestamp: { $lte: eventDate } }],
      },
      {
        $set: {
          status: mapping.status,
          lastStatusTimestamp: eventDate,
          ...(latestScanLocation ? { lastScanLocation: latestScanLocation } : {}),
        },
      },
      { new: true }
    );

    if (!updated) {
      await WebhookEventModel.updateOne({ _id: event._id }, { $set: { status: 'rejected_invalid_transition' } });
      return;
    }

    // 9. Successfully updated
    await WebhookEventModel.updateOne({ _id: event._id }, { $set: { status: 'processed' } });

    // 10. Update order fulfilment status across all forward shipments
    if (shipment.direction === 'forward') {
      await syncOrderFulfilmentStatus(shipment.orderId);
    }

    // 11. Trigger side effect background jobs
    await triggerShipmentSideEffects(updated, mapping, rawPayload);
  } catch (err: any) {
    await WebhookEventModel.updateOne(
      { _id: event._id },
      { $set: { status: 'failed', error: err.message } }
    );
    throw err;
  }
}

/**
 * Derives and updates order.fulfilmentStatus across all forward shipments of an order.
 */
export async function syncOrderFulfilmentStatus(orderId: string): Promise<void> {
  const shipments = await ShipmentModel.find({ orderId, direction: 'forward' });
  if (shipments.length === 0) return;

  const statuses = shipments.map((s) => s.status);
  let derived: 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'returned' = 'packed';

  if (statuses.every((s) => s === 'delivered')) {
    derived = 'delivered';
  } else if (statuses.every((s) => s === 'cancelled' || s === 'rto_delivered')) {
    derived = 'returned';
  } else if (statuses.some((s) => ['in_transit', 'out_for_delivery', 'ndr_undelivered'].includes(s))) {
    derived = 'in_transit' as any;
  } else if (statuses.some((s) => ['picked_up', 'manifested'].includes(s))) {
    derived = 'shipped';
  }

  await OrderModel.updateOne({ _id: orderId }, { $set: { fulfilmentStatus: derived } });
}

/**
 * Dispatches side effects as separate idempotent background jobs.
 */
async function triggerShipmentSideEffects(
  shipment: any,
  mapping: any,
  rawPayload: any
): Promise<void> {
  const awb = shipment.awb;
  const status = shipment.status;

  // 1. Delivery & COD Settlement verification
  if (status === 'delivered') {
    if (shipment.direction === 'forward' && shipment.cod?.isCod) {
      await jobService.enqueueJob(
        'verify_cod_delivery',
        { awb, orderId: shipment.orderId },
        { dedupeKey: `cod_verify_${awb}` }
      );
    } else if (shipment.direction === 'return' && shipment.returnId) {
      await ReturnModel.updateOne(
        { returnNo: shipment.returnId },
        { $set: { status: 'received' } }
      );
    }
  }

  // 2. NDR initiation side effect
  if (status === 'ndr_undelivered') {
    await jobService.enqueueJob(
      'send_ndr_customer_email',
      {
        awb,
        shipmentId: shipment._id.toString(),
        orderId: shipment.orderId,
        reason: rawPayload.ndr_status || 'Delivery attempt unsuccessful',
      },
      { dedupeKey: `ndr_notify_${awb}_${shipment.ndr.attemptCount + 1}` }
    );
  }

  // 3. Forward RTO delivered -> creates a Return record with source: 'rto'
  if (status === 'rto_delivered' && shipment.direction === 'forward') {
    const existingRto = await ReturnModel.findOne({ orderId: shipment.orderId, 'items.0.reason': 'rto' });
    if (!existingRto) {
      await ReturnModel.create({
        returnNo: `RET_RTO_${shipment.orderNo}`,
        orderId: shipment.orderId,
        orderNo: shipment.orderNo,
        customerPhone: '0000000000',
        items: [
          {
            variantId: 'rto_all',
            productName: 'RTO Returned Parcel',
            size: 'M',
            quantity: 1,
            reason: 'rto',
            condition: 'unopened',
          },
        ],
        status: 'received',
        refundAmountPaise: 0,
      });
    }
  }
}

/**
 * Sweeper function to re-enqueue stuck logistics events.
 */
export async function sweepStuckLogisticsEvents(): Promise<number> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const stuckEvents = await WebhookEventModel.find({
    source: 'shiprocket',
    status: { $in: ['received', 'processing'] },
    updatedAt: { $lt: fiveMinutesAgo },
  }).limit(50);

  let reEnqueued = 0;
  for (const event of stuckEvents) {
    await jobService.enqueueJob(
      'process_logistics_event',
      { eventKey: event.eventKey },
      { dedupeKey: `proc_logistics_${event.eventKey}` }
    );
    reEnqueued++;
  }
  return reEnqueued;
}
