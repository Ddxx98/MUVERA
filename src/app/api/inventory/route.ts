import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryService } from '@/modules/inventory/service';
import { requireAdmin } from '@/modules/auth/guards';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const start = performance.now();
  const { searchParams } = new URL(req.url);
  const variantId = searchParams.get('variantId');
  const sku = searchParams.get('sku');
  const locationId = searchParams.get('locationId') || 'loc_blr_ind_01';

  // 1. Point lookup by variantId or sku (< 10ms)
  if (variantId || sku) {
    let item;
    if (variantId) {
      item = await db.getInventoryItem(variantId, locationId);
    }
    if (!item && sku) {
      const all = await db.getInventory();
      item = all.find((i) => i.sku?.toUpperCase() === sku.toUpperCase());
    }
    const duration = Math.round(performance.now() - start);
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }
    const res = NextResponse.json({ item });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('Server-Timing', `db;dur=${duration}`);
    return res;
  }

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

  const duration = Math.round(performance.now() - start);
  const res = NextResponse.json({ inventory: enrichedList, movements });
  // Invariant: Live stock availability must NEVER be cached
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.headers.set('Server-Timing', `db;dur=${duration}`);
  return res;
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

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
    const status = err?.statusCode || (err?.code === 'UNAUTHORIZED' ? 401 : err?.code === 'FORBIDDEN' ? 403 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}
