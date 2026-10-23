import type { Metadata, Viewport } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-context';
import { StoreProvider } from '@/lib/store-context';
import { ToastProvider } from '@/lib/toast-context';
import { StoreHeader } from '@/components/store/StoreHeader';
import { BottomNav } from '@/components/store/BottomNav';
import { CartDrawer } from '@/components/store/CartDrawer';
import { Footer } from '@/components/store/Footer';
import { db } from '@/lib/db';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const siteUrl = 'https://muvera.in';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'MUVERA | Luxury Streetwear & Midnight Nocturne Clubwear',
    template: '%s | MUVERA',
  },
  description: 'Luxury fashion, oversized tees, heavyweight hoodies, satin bombers, and midnight statement fits delivered with express doorstep courier shipping across India.',
  applicationName: 'MUVERA',
  authors: [{ name: 'MUVERA Design House', url: siteUrl }],
  generator: 'Next.js',
  keywords: [
    'MUVERA',
    'MUVERA Club',
    'luxury streetwear',
    'oversized tees',
    'heavyweight hoodies',
    'parachute cargoes',
    'satin bombers',
    'midnight glamour',
    'nightlife fashion',
    'express streetwear delivery',
    'designer clothing india',
    'party fits',
    'high street fashion',
    'try and buy clothing',
    'streetwear bangalore',
  ],
  referrer: 'origin-when-cross-origin',
  creator: 'MUVERA',
  publisher: 'MUVERA Luxury Streetwear',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'MUVERA | Luxury Streetwear & Midnight Nocturne Clubwear',
    description: 'Curated high-street fashion, oversized drops & midnight statement fits with express courier dispatch.',
    url: siteUrl,
    siteName: 'MUVERA',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'MUVERA Luxury Streetwear & Nocturne Clubwear',
        type: 'image/svg+xml',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MUVERA | Luxury Streetwear & Midnight Nocturne Clubwear',
    description: 'Curated high-street statement pieces & limited club editions delivered with express speed.',
    site: '@muveraclub',
    creator: '@muveraclub',
    images: ['/og-image.svg'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: [
      { url: '/icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'Fashion & Apparel',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#0A0A0A' },
  ],
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'MUVERA',
      alternateName: 'MUVERA Luxury Streetwear',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/icon.svg`,
        width: 512,
        height: 512,
      },
      sameAs: [
        'https://instagram.com/muvera.club',
        'https://twitter.com/muveraclub',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+91 93809 33170',
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['en', 'hi'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'MUVERA',
      description: 'Luxury fashion & streetwear commerce with express courier delivery.',
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialSettings = null;
  try {
    initialSettings = await db.getSiteSettings();
  } catch (err) {
    console.error('Failed to pre-fetch initial settings in RootLayout:', err);
  }

  return (
    <html lang="en" className={`dark ${outfit.variable} ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('muvera_theme');
                if (stored && stored !== 'dark') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add(stored);
                }
              } catch (e) {}
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body className="bg-surface text-on-surface antialiased selection:bg-primary selection:text-surface-base">
        <ThemeProvider>
          <StoreProvider initialSettings={initialSettings}>
            <ToastProvider>
              <StoreHeader />
              <CartDrawer />
              <main className="min-h-screen pt-20">
                {children}
              </main>
              <BottomNav />
              <Footer />
            </ToastProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
