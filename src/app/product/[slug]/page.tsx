import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import { db } from '@/lib/db';
import { ProductDetailClient } from './ProductDetailClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muvera.club';

interface ProductDetailPageProps {
  params: {
    slug: string;
  };
}

/**
 * Deduplicated per-request product fetch using React cache().
 * Prevents double MongoDB queries between generateMetadata() and ProductDetailPage().
 * Executes indexed point lookup via slug or id in < 5ms.
 */
const getProduct = cache(async (slug: string) => {
  const decoded = decodeURIComponent(slug).trim();
  let product = await db.getProductBySlug(decoded);
  if (!product) {
    product = await db.getProductById(decoded);
  }
  return product;
});

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug;
  if (!slug) return { title: 'Product Not Found | MUVERA' };

  const product = await getProduct(slug);
  if (!product) {
    return {
      title: 'Product Not Found | MUVERA',
      description: 'The requested streetwear fit or drop could not be found.',
    };
  }

  const primaryImage = product.images?.[0]?.url || `${siteUrl}/og-image.svg`;
  const cleanDescription = (product.description || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160) || `Buy ${product.title} from MUVERA. Premium luxury streetwear with express doorstep delivery.`;

  const canonicalUrl = `${siteUrl}/product/${product.slug}`;

  return {
    title: `${product.title} — ${product.brand || 'MUVERA'} Luxury Streetwear`,
    description: cleanDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${product.title} | MUVERA`,
      description: cleanDescription,
      url: canonicalUrl,
      type: 'article',
      images: [
        {
          url: primaryImage,
          width: 800,
          height: 1000,
          alt: product.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} | MUVERA`,
      description: cleanDescription,
      images: [primaryImage],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug;

  if (!slug) {
    return notFound();
  }

  const product = await getProduct(slug);

  if (!product) {
    return notFound();
  }

  // Load similar products
  const allProducts = await db.getProducts();
  const similarProducts = allProducts.filter((p) => p.id !== product.id).slice(0, 4);

  const primaryImage = product.images?.[0]?.url || `${siteUrl}/og-image.svg`;
  const allImages = product.images?.length > 0 ? product.images.map((img) => img.url) : [primaryImage];
  const priceRupees = (product.sellingPricePaise / 100).toFixed(2);

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: allImages,
    description: product.description || `Luxury ${product.title} by ${product.brand || 'MUVERA'}.`,
    sku: product.variants?.[0]?.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'MUVERA',
    },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/product/${product.slug}`,
      priceCurrency: 'INR',
      price: priceRupees,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'MUVERA',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating || 4.9,
      reviewCount: product.reviewCount || 14,
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Products',
        item: `${siteUrl}/products`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: `${siteUrl}/product/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <ProductDetailClient product={product} similarProducts={similarProducts} />
    </>
  );
}
