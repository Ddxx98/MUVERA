import { NextResponse } from 'next/server';
import { catalogService } from '@/modules/catalog';
import { db } from '@/lib/db';
import { Product, SizeOption } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : body.products;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No products provided for bulk import' }, { status: 400 });
    }

    const results: {
      success: boolean;
      title: string;
      slug?: string;
      error?: string;
    }[] = [];

    const sizes: SizeOption[] = ['S', 'M', 'L', 'XL', 'XXL'];

    for (const row of items) {
      try {
        const title = (row.title || row.Title || '').trim();
        if (!title) {
          results.push({ success: false, title: 'Unknown', error: 'Title is required' });
          continue;
        }

        const category = (row.category || row.Category || 'Streetwear').trim();
        const priceNum = parseFloat(row.price || row.Price || row.sellingPrice || '0');
        const mrpNum = parseFloat(row.mrp || row.MRP || row.mrpPrice || priceNum || '0');
        const sellingPricePaise = Math.round(priceNum * 100);
        const mrpPaise = Math.round(mrpNum * 100);
        const discountPercentage = mrpPaise > sellingPricePaise ? Math.round(((mrpPaise - sellingPricePaise) / mrpPaise) * 100) : 0;

        const description = (row.description || row.Description || `${title} from the exclusive MUVERA luxury collection.`).trim();
        const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        // SKU prefix
        const rawPrefix = (row.sku_prefix || row.SKUPrefix || row.sku || title.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, '');
        const skuPrefix = rawPrefix.length >= 2 ? rawPrefix : 'MUV';

        // Parse images
        const rawImages = row.image_urls || row.ImageURLs || row.images || '';
        let imageUrls: string[] = [];
        if (Array.isArray(rawImages)) {
          imageUrls = rawImages.map((u: any) => typeof u === 'string' ? u : u.url).filter(Boolean);
        } else if (typeof rawImages === 'string') {
          imageUrls = rawImages
            .split(/[\n,;]/)
            .map((u) => u.trim())
            .filter((u) => u.length > 5);
        }

        if (imageUrls.length === 0) {
          // Default placeholder high-fashion streetwear image if none provided
          imageUrls = ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=1200'];
        }

        const formattedImages = imageUrls.map((url, idx) => ({
          url,
          alt: `${title} - Angle ${idx + 1}`,
          order: idx,
        }));

        // Stock counts per size
        const stockMap: Record<SizeOption, number> = {
          XS: parseInt(row.stock_xs ?? row.Stock_XS ?? row.stockXS ?? '0', 10) || 0,
          S: parseInt(row.stock_s ?? row.Stock_S ?? row.stockS ?? '10', 10) || 0,
          M: parseInt(row.stock_m ?? row.Stock_M ?? row.stockM ?? '15', 10) || 0,
          L: parseInt(row.stock_l ?? row.Stock_L ?? row.stockL ?? '15', 10) || 0,
          XL: parseInt(row.stock_xl ?? row.Stock_XL ?? row.stockXL ?? '10', 10) || 0,
          XXL: parseInt(row.stock_xxl ?? row.Stock_XXL ?? row.stockXXL ?? '5', 10) || 0,
        };

        const productId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const variants = sizes.map((sz) => {
          const sku = `${skuPrefix}-${sz}`;
          return {
            id: `var_${slug}_${sz.toLowerCase()}`,
            sku,
            size: sz,
            color: 'Midnight Black',
            colorHex: '#0E0E10',
            pricePaise: sellingPricePaise,
            mrpPaise: mrpPaise,
            initialStock: stockMap[sz],
          };
        });

        const isBlitz = Boolean(
          row.is_drop === true ||
          row.is_drop === 'TRUE' ||
          row.is_drop === 'true' ||
          row.is_drop === '1'
        );

        const newProduct: Product = {
          id: productId,
          title,
          slug,
          brand: 'MUVERA',
          brandSlug: 'muvera',
          category,
          categorySlug,
          description,
          fabricDetails: row.fabric || row.Fabric || '100% Super Combed Cotton French Terry (380-450 GSM)',
          mrpPaise,
          sellingPricePaise,
          discountPercentage,
          images: formattedImages,
          variants: variants as any,
          isBlitzDrop: isBlitz,
          isDealOfTheHour: false,
          rating: 4.8,
          reviewCount: Math.floor(Math.random() * 20) + 5,
          tags: [category.toLowerCase(), 'luxury', 'streetwear', 'muvera'],
          createdAt: new Date().toISOString(),
        };

        const saved = await catalogService.upsertProduct(newProduct, 'Excel Bulk Import');

        // Initialize inventory and stock movement for each variant
        for (const v of variants) {
          const stockQty = v.initialStock;
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
              reason: 'Excel bulk import stock intake',
              actor: 'Admin Bulk Importer',
              createdAt: new Date().toISOString(),
            });
          }
        }

        results.push({ success: true, title, slug });
      } catch (err: any) {
        results.push({
          success: false,
          title: row.title || 'Unknown',
          error: err.message || 'Failed to process row',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      total: items.length,
      successCount,
      failureCount,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
