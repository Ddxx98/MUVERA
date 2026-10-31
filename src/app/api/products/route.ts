import { NextResponse } from 'next/server';
import { catalogService } from '@/modules/catalog';
import { db } from '@/lib/db';
import { Product } from '@/lib/types';
import { requireAdmin } from '@/modules/auth/guards';
import { revalidatePath } from 'next/cache';

export async function GET(req: Request) {
  const start = performance.now();
  const { searchParams } = new URL(req.url);

  // 1. Direct ID point lookup (< 10ms)
  const id = searchParams.get('id');
  if (id) {
    const product = await catalogService.getProductById(id);
    const duration = Math.round(performance.now() - start);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const res = NextResponse.json({ product });
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.headers.set('Server-Timing', `db;dur=${duration}`);
    return res;
  }

  // 2. Direct slug point lookup (< 10ms)
  const slug = searchParams.get('slug');
  if (slug) {
    const product = await catalogService.getProductBySlug(slug);
    const duration = Math.round(performance.now() - start);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const res = NextResponse.json({ product });
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.headers.set('Server-Timing', `db;dur=${duration}`);
    return res;
  }

  // 3. Filtered list query
  const categoryId = searchParams.get('categoryId') || undefined;
  const category = searchParams.get('category') || undefined;
  const brand = searchParams.get('brand') || undefined;
  const search = searchParams.get('search') || searchParams.get('q') || undefined;
  const isBlitzDrop = searchParams.get('isBlitzDrop') === 'true' ? true : undefined;
  const isDealOfTheHour = searchParams.get('isDealOfTheHour') === 'true' ? true : undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
  const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!, 10) : undefined;
  const minPricePaise = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!, 10) : undefined;
  const maxPricePaise = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!, 10) : undefined;

  const products = await catalogService.getProducts({
    categoryId,
    category,
    brand,
    search,
    isBlitzDrop,
    isDealOfTheHour,
    limit,
    skip,
    minPricePaise,
    maxPricePaise,
  });
  const duration = Math.round(performance.now() - start);

  const res = NextResponse.json({ products });
  // Public catalog reads cached at edge with SWR
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.headers.set('Server-Timing', `db;dur=${duration}`);
  return res;
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const product: Product = await req.json();
    if (!product.title || !product.slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
    }

    // Ensure variants have deterministic IDs and required schema fields
    if (Array.isArray(product.variants)) {
      product.variants = product.variants.map((v, i) => ({
        ...v,
        id: v.id || `var_${product.slug}_${v.size || i}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sku: v.sku || `${product.slug.toUpperCase()}-${v.size || i}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        color: v.color || 'Obsidian Black',
        colorHex: v.colorHex || '#0E0E10',
        pricePaise: typeof v.pricePaise === 'number' ? v.pricePaise : product.sellingPricePaise,
        mrpPaise: typeof v.mrpPaise === 'number' ? v.mrpPaise : product.mrpPaise,
      }));
    }

    const saved = await catalogService.upsertProduct(product, 'Admin API');

    // Automatically initialize inventory for each variant
    if (saved && Array.isArray(saved.variants)) {
      for (const v of saved.variants) {
        const variantId = v.id || (v as any)._id?.toString();
        if (!variantId) continue;

        const existingInv = await db.getInventoryItem(variantId, 'loc_blr_ind_01');
        if (!existingInv) {
          const stockQty = typeof (v as any).initialStock === 'number'
            ? (v as any).initialStock
            : typeof (v as any).stock === 'number'
            ? (v as any).stock
            : 10;

          await db.saveInventoryItem({
            variantId,
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
              variantId,
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

    revalidatePath('/products');
    revalidatePath('/');
    return NextResponse.json({ success: true, product: saved });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: 'A product with this slug, title, or variant SKU already exists in the catalog.' },
        { status: 409 }
      );
    }
    const status = err?.statusCode || (err?.code === 'UNAUTHORIZED' ? 401 : err?.code === 'FORBIDDEN' ? 403 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();

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

    revalidatePath('/products');
    revalidatePath(`/product/${saved.slug}`);
    revalidatePath('/');
    return NextResponse.json({ success: true, product: saved });
  } catch (err: any) {
    const status = err?.statusCode || (err?.code === 'UNAUTHORIZED' ? 401 : err?.code === 'FORBIDDEN' ? 403 : 400);
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required for deletion' }, { status: 400 });
    }

    const success = await catalogService.deleteProduct(id, 'Admin Catalog Delete');
    revalidatePath('/products');
    revalidatePath('/');
    return NextResponse.json({ success });
  } catch (err: any) {
    const status = err?.statusCode || (err?.code === 'UNAUTHORIZED' ? 401 : err?.code === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: err.message }, { status });
  }
}
