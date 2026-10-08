import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ProductDetailClient } from './ProductDetailClient';

interface ProductDetailPageProps {
  params: {
    slug: string;
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug;

  if (!slug) {
    return notFound();
  }

  // 1. Try finding by slug
  let product = await db.getProductBySlug(slug);

  // 2. Fallback to finding by ID if slug not found
  if (!product) {
    product = await db.getProductById(slug);
  }

  // 3. Fallback to slug decoding or case-insensitive match
  if (!product) {
    const all = await db.getProducts();
    product = all.find(
      (p) =>
        p.slug.toLowerCase() === decodeURIComponent(slug).toLowerCase() ||
        p.id === slug
    );
  }

  if (!product) {
    return notFound();
  }

  // Load similar products
  const allProducts = await db.getProducts();
  const similarProducts = allProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return <ProductDetailClient product={product} similarProducts={similarProducts} />;
}
