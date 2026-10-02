import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryService } from '@/modules/inventory/service';

export async function GET() {
  const [rawInventory, movements, products] = await Promise.all([
    db.getInventory(),
    db.getStockMovements(),
    db.getProducts(),
  ]);

  // Build lookup map for all variants across all products
  const variantMap = new Map<string, {
    productId: string;
    productTitle: string;
    productSlug: string;
    brand: string;
    image: string;
    size: string;
    color: string;
  }>();

  for (const prod of products) {
    const mainImg = prod.images?.[0]?.url || '';
    for (const v of prod.variants || []) {
      const meta = {
        productId: prod.id,
        productTitle: prod.title,
        productSlug: prod.slug,
        brand: prod.brand,
        image: mainImg,
        size: v.size,
        color: v.color || '',
      };
      if (v.id) variantMap.set(v.id, meta);
      if (v.sku) variantMap.set(v.sku.toUpperCase(), meta);
    }
  }

  // Track existing inventory SKUs to ensure all variants are displayed
  const seenSkus = new Set<string>();
  const enrichedList = rawInventory.map((item) => {
    seenSkus.add((item.sku || '').toUpperCase());
    const meta = (item.variantId ? variantMap.get(item.variantId) : undefined) ||
                 (item.sku ? variantMap.get(item.sku.toUpperCase()) : undefined);
    return {
      ...item,
      productTitle: meta?.productTitle || 'Streetwear Fashion Item',
      productSlug: meta?.productSlug || '',
      brand: meta?.brand || 'MUVERA',
      image: meta?.image || '',
      size: meta?.size || '',
      color: meta?.color || '',
    };
  });

  // If there are variants in the catalog not yet recorded in inventory, include them
  for (const prod of products) {
    const mainImg = prod.images?.[0]?.url || '';
    for (const v of prod.variants || []) {
      const skuKey = (v.sku || '').toUpperCase();
      if (!seenSkus.has(skuKey)) {
        seenSkus.add(skuKey);
        enrichedList.push({
          variantId: v.id,
          locationId: 'loc_blr_ind_01',
          sku: v.sku,
          onHand: 0,
          reserved: 0,
          available: 0,
          lowStockThreshold: 3,
          updatedAt: new Date().toISOString(),
          productTitle: prod.title,
          productSlug: prod.slug,
          brand: prod.brand,
          image: mainImg,
          size: v.size,
          color: v.color || '',
        });
      }
    }
  }

  return NextResponse.json({ inventory: enrichedList, movements });
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
