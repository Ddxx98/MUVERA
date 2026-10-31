import { ReturnModel } from '@/lib/models';
import { inventoryService } from '@/modules/inventory/service';
import { locationService } from '@/modules/locations/service';
import { paymentService } from '@/modules/payments/service';
import { auditService } from '@/modules/audit/service';

export interface ItemInspectionInput {
  variantId: string;
  restockQty: number;
  damagedQty: number;
}

export interface ReturnInspectionInput {
  returnNo: string;
  actor: string;
  decisions: ItemInspectionInput[];
}

/**
 * Performs per-item warehouse dark store return inspection idempotently.
 */
export async function processReturnInspection(input: ReturnInspectionInput): Promise<void> {
  const ret = await ReturnModel.findOne({ returnNo: input.returnNo });
  if (!ret) throw new Error(`Return record ${input.returnNo} not found`);

  if (ret.status === 'inspected' || ret.status === 'closed') {
    return; // Idempotent protection against double-clicks
  }

  if (ret.status !== 'received') {
    throw new Error(`Return must be in 'received' state to inspect (current: '${ret.status}')`);
  }

  const mainLocation = await locationService.getLocationByCode('MAIN_WAREHOUSE').catch(() => null);
  const locationId = mainLocation?.code || 'loc_blr_ind_01';

  for (const dec of input.decisions) {
    const returnItem = ret.items.find((i: any) => i.variantId === dec.variantId);
    if (!returnItem) {
      throw new Error(`Item ${dec.variantId} does not belong to return ${ret.returnNo}`);
    }

    if (dec.restockQty + dec.damagedQty !== returnItem.quantity) {
      throw new Error(
        `Quantity mismatch for item ${dec.variantId}: restock (${dec.restockQty}) + damaged (${dec.damagedQty}) must equal return item quantity (${returnItem.quantity})`
      );
    }

    if (dec.restockQty > 0) {
      await inventoryService.returnStock(
        returnItem.variantId,
        returnItem.variantId, // SKU
        locationId,
        dec.restockQty,
        ret.returnNo,
        input.actor
      );
    }

    returnItem.inspectionDecision = dec.damagedQty > 0 ? 'damaged_write_off' : 'restock';
  }

  ret.status = 'inspected';
  await ret.save();

  // If prepaid order with pending refund
  if (ret.refundAmountPaise > 0) {
    await paymentService.refund({
      orderId: ret.orderId,
      paymentId: `ref_${ret.orderId}`,
      amountPaise: ret.refundAmountPaise,
      reason: `Return refund for ${ret.returnNo}`,
    });
  }

  await auditService.recordAudit({
    action: 'RETURN_INSPECTION_COMPLETED',
    entity: 'return',
    entityId: ret.returnNo,
    actor: input.actor,
    metadata: { decisions: input.decisions },
  });
}
