import { NextResponse } from 'next/server';
import { catalogService } from '@/modules/catalog';
import { db } from '@/lib/db';
import { Product } from '@/lib/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const brand = searchParams.get('brand') || undefined;
  const search = searchParams.get('search') || undefined;

  const products = await catalogService.getProducts({ category, brand, search });
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  try {
    const product: Product = await req.json();
    const saved = await catalogService.upsertProduct(product, 'Admin API');

    // Automatically initialize inventory for each variant
    if (saved && Array.isArray(saved.variants)) {
      for (const v of saved.variants) {
        const existingInv = await db.getInventoryItem(v.id, 'loc_blr_ind_01');
        if (!existingInv) {
          const stockQty = typeof (v as any).initialStock === 'number' ? (v as any).initialStock : 10;
          await db.saveInventoryItem({
            variantId: v.id,
            locationId: 'loc_blr_ind_01',
            sku: v.sku,
            onHand: stockQty,
            reserved: 0,
            available: stockQty,
            lowStockThreshold: 3,
            updatedAt: new Date().toISOString(),
          });

          if (stockQty > 0) {
            await db.addStockMovement({
              id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              variantId: v.id,
              sku: v.sku,
              locationId: 'loc_blr_ind_01',
              type: 'receiving',
              quantityDelta: stockQty,
              previousOnHand: 0,
              newOnHand: stockQty,
              referenceId: saved.id,
              reason: 'Initial stock intake upon product creation',
              actor: 'Admin Catalog',
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, product: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const product: Product = await req.json();
    if (!product.id && !product.slug) {
      return NextResponse.json({ error: 'Product ID or slug is required for updating' }, { status: 400 });
    }

    const saved = await catalogService.upsertProduct(product, 'Admin Catalog Edit');

    // Sync inventory stock for variants if provided
    if (saved && Array.isArray(saved.variants)) {
      for (const v of saved.variants) {
        const stockQty = typeof (v as any).stock === 'number'
          ? (v as any).stock
          : typeof (v as any).initialStock === 'number'
          ? (v as any).initialStock
          : null;

        if (stockQty !== null) {
          const existingInv = await db.getInventoryItem(v.id, 'loc_blr_ind_01');
          if (existingInv) {
            const previous = existingInv.onHand;
            const diff = stockQty - previous;
            await db.saveInventoryItem({
              ...existingInv,
              onHand: stockQty,
              available: Math.max(0, stockQty - existingInv.reserved),
              sku: v.sku,
              updatedAt: new Date().toISOString(),
            });

            if (diff !== 0) {
              await db.addStockMovement({
                id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                variantId: v.id,
                sku: v.sku,
                locationId: 'loc_blr_ind_01',
                type: 'correction',
                quantityDelta: diff,
                previousOnHand: previous,
                newOnHand: stockQty,
                referenceId: saved.id,
                reason: 'Stock updated during product edit',
                actor: 'Admin Catalog Edit',
                createdAt: new Date().toISOString(),
              });
            }
          } else {
            await db.saveInventoryItem({
              variantId: v.id,
              locationId: 'loc_blr_ind_01',
              sku: v.sku,
              onHand: stockQty,
              reserved: 0,
              available: stockQty,
              lowStockThreshold: 3,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, product: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required for deletion' }, { status: 400 });
    }

    const success = await catalogService.deleteProduct(id, 'Admin Catalog Delete');
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
