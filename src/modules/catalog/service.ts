import { db } from '@/lib/db';
import { Product } from '@/lib/types';
import { auditService } from '@/modules/audit';

export interface CatalogFilterOptions {
  category?: string;
  brand?: string;
  search?: string;
  minPricePaise?: number;
  maxPricePaise?: number;
}

export const catalogService = {
  async getProducts(filters: CatalogFilterOptions = {}): Promise<Product[]> {
    let products = await db.getProducts();

    if (filters.category && filters.category !== 'all') {
      const catLower = filters.category.toLowerCase();
      products = products.filter((p) => p.category.toLowerCase() === catLower);
    }

    if (filters.brand && filters.brand !== 'all') {
      const brandLower = filters.brand.toLowerCase();
      products = products.filter((p) => p.brand.toLowerCase() === brandLower);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (filters.minPricePaise !== undefined) {
      products = products.filter((p) => p.sellingPricePaise >= filters.minPricePaise!);
    }

    if (filters.maxPricePaise !== undefined) {
      products = products.filter((p) => p.sellingPricePaise <= filters.maxPricePaise!);
    }

    return products;
  },

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    return db.getProductBySlug(slug);
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return db.getProductById(id);
  },

  async upsertProduct(product: Product, actor = 'Catalog Admin'): Promise<Product> {
    const existing = product.id ? await db.getProductById(product.id) : undefined;
    const saved = await db.saveProduct(product);

    await auditService.recordAudit({
      action: existing ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE',
      entity: 'product',
      entityId: saved.id,
      actor,
      before: existing ? (existing as any) : undefined,
      after: saved as any,
    });

    return saved;
  },

  async deleteProduct(id: string, actor = 'Catalog Admin'): Promise<boolean> {
    const existing = await db.getProductById(id);
    if (!existing) return false;
    await db.deleteProduct(id);

    await auditService.recordAudit({
      action: 'PRODUCT_DELETE',
      entity: 'product',
      entityId: id,
      actor,
      before: existing as any,
    });

    return true;
  },

  async getCategories(): Promise<string[]> {
    const products = await db.getProducts();
    const categories = new Set(products.map((p) => p.category));
    return Array.from(categories);
  },

  async getBrands(): Promise<string[]> {
    const products = await db.getProducts();
    const brands = new Set(products.map((p) => p.brand));
    return Array.from(brands);
  },
};
