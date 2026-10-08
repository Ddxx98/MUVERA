import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Streetwear Drops & Catalog — MUVERA Luxury Collections',
  description: 'Shop limited edition streetwear drops, acid-wash oversized tees, heavyweight hoodies, and midnight nocturne partywear. Fast express dispatch across India.',
  alternates: {
    canonical: '/products',
  },
  openGraph: {
    title: 'All Streetwear Drops & Catalog | MUVERA',
    description: 'Shop limited edition luxury streetwear drops, heavyweight hoodies, and midnight clubwear.',
    url: '/products',
    images: ['/og-image.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Streetwear Drops & Catalog | MUVERA',
    description: 'Shop limited edition luxury streetwear drops, heavyweight hoodies, and midnight clubwear.',
    images: ['/og-image.svg'],
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
