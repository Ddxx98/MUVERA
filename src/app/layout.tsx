import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-context';
import { StoreProvider } from '@/lib/store-context';
import { ToastProvider } from '@/lib/toast-context';
import { StoreHeader } from '@/components/store/StoreHeader';
import { BottomNav } from '@/components/store/BottomNav';
import { CartDrawer } from '@/components/store/CartDrawer';
import { Footer } from '@/components/store/Footer';

export const metadata: Metadata = {
  title: 'MUVERA — 60-Minute Luxury Streetwear & Fashion Commerce',
  description: 'Midnight Quick-Glam luxury fashion & streetwear commerce delivered from dark stores in 60 minutes.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('muvera_theme');
                var theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-surface text-on-surface antialiased selection:bg-primary selection:text-surface-base">
        <ThemeProvider>
          <StoreProvider>
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
