import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryService } from '@/modules/inventory/service';

export async function GET() {
  const inventory = await db.getInventory();
  const movements = await db.getStockMovements();
  return NextResponse.json({ inventory, movements });
}

export async function POST(req: Request) {
  try {
    const { variantId, sku, locationId, quantityDelta, reason, actor } = await req.json();

    await inventoryService.adjustStock(
      variantId,
      sku,
      locationId || 'loc_blr_ind_01',
      quantityDelta,
      reason,
      actor || 'Operations Admin'
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
