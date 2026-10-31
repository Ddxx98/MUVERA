import { db } from '@/lib/db';
import { Product } from '@/lib/types';
import { auditService } from '@/modules/audit';

export interface CatalogFilterOptions {
  categoryId?: string;
  category?: string;
  categorySlug?: string;
  brand?: string;
  brandSlug?: string;
  search?: string;
  isBlitzDrop?: boolean;
  isDealOfTheHour?: boolean;
  minPricePaise?: number;
  maxPricePaise?: number;
  limit?: number;
  skip?: number;
}

export const catalogService = {
  async getProducts(filters: CatalogFilterOptions = {}): Promise<Product[]> {
    return db.getProducts({
      categoryId: filters.categoryId,
      category: filters.category,
      categorySlug: filters.categorySlug,
      brand: filters.brand,
      brandSlug: filters.brandSlug,
      search: filters.search,
      isBlitzDrop: filters.isBlitzDrop,
      isDealOfTheHour: filters.isDealOfTheHour,
      minPricePaise: filters.minPricePaise,
      maxPricePaise: filters.maxPricePaise,
      limit: filters.limit,
      skip: filters.skip,
    });
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
