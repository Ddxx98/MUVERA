import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Luxury Streetwear & Nocturne Drops — MUVERA',
  description: 'Search MUVERA luxury streetwear, oversized t-shirts, heavyweight hoodies, tactical cargoes, and exclusive club fits.',
  alternates: {
    canonical: '/search',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
