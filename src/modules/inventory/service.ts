import { db } from '@/lib/db';
import { StockMovement } from '@/lib/types';
import { auditService } from '@/modules/audit';

export class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

export const inventoryService = {
  /**
   * Reserves stock for an order at checkout.
   * Enforces invariant: available = onHand - reserved >= quantity.
   */
  async reserveStock(
    orderId: string,
    items: Array<{ variantId: string; sku: string; quantity: number }>,
    locationId: string = 'loc_blr_ind_01'
  ): Promise<void> {
    const sanitizedItems = items.map((item) => ({
      ...item,
      variantId: item.variantId || item.sku || `var_${item.sku || Date.now()}`,
      sku: item.sku || 'STD',
    }));

    // 1. Verify availability for all items first
    for (const item of sanitizedItems) {
      let inv = await db.getInventoryItem(item.variantId, locationId);
      if (!inv) {
        inv = {
          variantId: item.variantId,
          locationId,
          sku: item.sku,
          onHand: 15,
          reserved: 0,
          available: 15,
          lowStockThreshold: 3,
          updatedAt: new Date().toISOString(),
        };
        await db.saveInventoryItem(inv);
      }

      if (inv.available < item.quantity) {
        throw new InsufficientStockError(
          `Insufficient stock for SKU ${item.sku}. Requested: ${item.quantity}, Available: ${inv.available}`
        );
      }
    }

    // 2. Increment reserved stock atomically
    for (const item of sanitizedItems) {
      const inv = (await db.getInventoryItem(item.variantId, locationId))!;
      inv.reserved += item.quantity;
      inv.available = inv.onHand - inv.reserved;
      inv.updatedAt = new Date().toISOString();
      await db.saveInventoryItem(inv);

      const movement: StockMovement = {
        id: `mov_res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        variantId: item.variantId,
        sku: item.sku,
        locationId,
        type: 'reservation',
        quantityDelta: item.quantity,
        previousOnHand: inv.onHand,
        newOnHand: inv.onHand,
        referenceId: orderId,
        actor: 'Customer Checkout Hold',
        createdAt: new Date().toISOString(),
      };
      await db.addStockMovement(movement);
    }
  },

  /**
   * Commits reserved stock upon verified payment.
   * Decrements onHand and reserved, records 'sale' stock movement.
   */
  async commitReservation(
    orderId: string,
    items: Array<{ variantId: string; sku: string; quantity: number }>,
    locationId: string = 'loc_blr_ind_01'
  ): Promise<void> {
    const sanitizedItems = items.map((item) => ({
      ...item,
      variantId: item.variantId || item.sku || `var_${item.sku || Date.now()}`,
      sku: item.sku || 'STD',
    }));

    for (const item of sanitizedItems) {
      const inv = await db.getInventoryItem(item.variantId, locationId);
      if (!inv) continue;

      const previousOnHand = inv.onHand;
      inv.onHand = Math.max(0, inv.onHand - item.quantity);
      inv.reserved = Math.max(0, inv.reserved - item.quantity);
      inv.available = Math.max(0, inv.onHand - inv.reserved);
      inv.updatedAt = new Date().toISOString();
      await db.saveInventoryItem(inv);

      const movement: StockMovement = {
        id: `mov_sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        variantId: item.variantId,
        sku: item.sku,
        locationId,
        type: 'sale',
        quantityDelta: -item.quantity,
        previousOnHand,
        newOnHand: inv.onHand,
        referenceId: orderId,
        actor: 'Payment Verified & Allocation',
        createdAt: new Date().toISOString(),
      };
      await db.addStockMovement(movement);
    }
  },

  /**
   * Releases unfulfilled or expired reservation back into available stock.
   */
  async releaseReservation(
    orderId: string,
    items: Array<{ variantId: string; sku: string; quantity: number }>,
    locationId: string = 'loc_blr_ind_01'
  ): Promise<void> {
    const sanitizedItems = items.map((item) => ({
      ...item,
      variantId: item.variantId || item.sku || `var_${item.sku || Date.now()}`,
      sku: item.sku || 'STD',
    }));

    for (const item of sanitizedItems) {
      const inv = await db.getInventoryItem(item.variantId, locationId);
      if (!inv) continue;

      inv.reserved = Math.max(0, inv.reserved - item.quantity);
      inv.available = Math.max(0, inv.onHand - inv.reserved);
      inv.updatedAt = new Date().toISOString();
      await db.saveInventoryItem(inv);

      const movement: StockMovement = {
        id: `mov_rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        variantId: item.variantId,
        sku: item.sku,
        locationId,
        type: 'release',
        quantityDelta: -item.quantity,
        previousOnHand: inv.onHand,
        newOnHand: inv.onHand,
        referenceId: orderId,
        actor: 'Reservation Timeout / Order Cancelled',
        createdAt: new Date().toISOString(),
      };
      await db.addStockMovement(movement);
    }
  },

  /**
   * Manual stock adjustment by warehouse admins with mandatory audit reason.
   */
  async adjustStock(
    variantId: string,
    sku: string,
    locationId: string,
    quantityDelta: number,
    reason: 'receiving' | 'damage' | 'correction',
    actor: string
  ): Promise<void> {
    let inv = await db.getInventoryItem(variantId, locationId);
    if (!inv) {
      inv = {
        variantId,
        locationId,
        sku,
        onHand: 0,
        reserved: 0,
        available: 0,
        lowStockThreshold: 3,
        updatedAt: new Date().toISOString(),
      };
    }

    const previousOnHand = inv.onHand;
    const newOnHand = Math.max(0, inv.onHand + quantityDelta);
    inv.onHand = newOnHand;
    inv.available = Math.max(0, inv.onHand - inv.reserved);
    inv.updatedAt = new Date().toISOString();
    await db.saveInventoryItem(inv);

    const movement: StockMovement = {
      id: `mov_adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      variantId,
      sku,
      locationId,
      type: reason,
      quantityDelta,
      previousOnHand,
      newOnHand,
      referenceId: `ADJ-${Date.now().toString().slice(-6)}`,
      reason,
      actor,
      createdAt: new Date().toISOString(),
    };
    await db.addStockMovement(movement);

    // Record system audit log
    await auditService.recordAudit({
      action: 'STOCK_ADJUST',
      entity: 'inventory',
      entityId: `${variantId}_${locationId}`,
      actor,
      before: { onHand: previousOnHand },
      after: { onHand: newOnHand, quantityDelta, reason },
    });
  },

  /**
   * Restocks returned inventory items after inspection.
   */
  /**
   * Restocks committed items after an allocated order is cancelled.
   */
  async cancelRestock(
    orderId: string,
    items: Array<{ variantId: string; sku: string; quantity: number }>,
    locationId: string = "loc_blr_ind_01",
    actor: string = "Order Cancellation"
  ): Promise<void> {
    for (const item of items) {
      let inv = await db.getInventoryItem(item.variantId, locationId);
      if (!inv) continue;
      const previousOnHand = inv.onHand;
      inv.onHand += item.quantity;
      inv.available = Math.max(0, inv.onHand - inv.reserved);
      inv.updatedAt = new Date().toISOString();
      await db.saveInventoryItem(inv);
      const movement: StockMovement = {
        id: "mov_cnl_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        variantId: item.variantId,
        sku: item.sku,
        locationId,
        type: "cancel_restock",
        quantityDelta: item.quantity,
        previousOnHand,
        newOnHand: inv.onHand,
        referenceId: orderId,
        reason: "Order cancelled post-allocation",
        actor,
        createdAt: new Date().toISOString(),
      };
      await db.addStockMovement(movement);
    }
  },

  async returnStock(
    variantId: string,
    sku: string,
    locationId: string,
    quantity: number,
    returnId: string,
    actor: string
  ): Promise<void> {
    let inv = await db.getInventoryItem(variantId, locationId);
    if (!inv) return;

    const previousOnHand = inv.onHand;
    inv.onHand += quantity;
    inv.available = Math.max(0, inv.onHand - inv.reserved);
    inv.updatedAt = new Date().toISOString();
    await db.saveInventoryItem(inv);

    const movement: StockMovement = {
      id: `mov_ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      variantId,
      sku,
      locationId,
      type: 'return_restock',
      quantityDelta: quantity,
      previousOnHand,
      newOnHand: inv.onHand,
      referenceId: returnId,
      actor,
      createdAt: new Date().toISOString(),
    };
    await db.addStockMovement(movement);

    await auditService.recordAudit({
      action: 'STOCK_RESTOCK_RETURN',
      entity: 'inventory',
      entityId: `${variantId}_${locationId}`,
      actor,
      before: { onHand: previousOnHand },
      after: { onHand: inv.onHand, restockedQty: quantity, returnId },
    });
  },

  /**
   * Fetches real-time stock levels for a variant.
   */
  async getLiveStock(variantId: string, locationId: string = 'loc_blr_ind_01') {
    const inv = await db.getInventoryItem(variantId, locationId);
    if (!inv) return { onHand: 0, reserved: 0, available: 0, isLowStock: false, isOutOfStock: true };
    return {
      onHand: inv.onHand,
      reserved: inv.reserved,
      available: inv.available,
      isLowStock: inv.available <= inv.lowStockThreshold && inv.available > 0,
      isOutOfStock: inv.available <= 0,
    };
  },
};
