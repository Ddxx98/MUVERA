import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { ProductCard } from '@/components/store/ProductCard';
import { siteConfig } from '@/config/site';
import { Zap, ArrowRight, Timer, Sparkles, Flame, ShieldCheck, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function HomePage() {
  const [products, settings] = await Promise.all([
    db.getProducts(),
    db.getSiteSettings(),
  ]);
  const blitzDrops = products.filter((p) => p.isBlitzDrop);
  const dealOfTheHour = products.find((p) => p.isDealOfTheHour) || products[0];

  const heroImage = settings?.heroBackgroundImage || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&auto=format&fit=crop&q=80';
  const heroTagBadge = settings?.heroTagBadge || 'Blitz Drop 04';
  const heroSecondaryBadge = settings?.heroSecondaryBadge || 'Try & Buy Available';
  const heroEyebrow = settings?.heroEyebrow || 'Instant Nightlife Glamour';
  const heroTitleLine1 = settings?.heroTitleLine1 || 'PARTY TONIGHT?';
  const heroTitleLine2 = settings?.heroTitleLine2 || 'EXPRESS STREETWEAR';
  const heroSubtitle = settings?.heroSubtitle || 'Curated luxury streetwear, statement drops & limited club editions delivered with express speed.';
  const heroCtaText = settings?.heroCtaText || 'Explore Drops';
  const heroCtaLink = settings?.heroCtaLink || '/products';
  const heroDeliveryTicker = settings?.heroDeliveryTicker || 'Dispatches today';
  const isHeroActive = settings?.heroActive !== false;

  return (
    <div className="pb-16 space-y-8">
      {/* 1. Hero Drop Banner (Theatrical Midnight Glamour) */}
      {isHeroActive && (
        <section className="max-w-7xl mx-auto px-4 pt-2">
          <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-surface-raised shadow-2xl border border-surface-border">
            <div className="relative h-[380px] sm:h-[460px] w-full flex flex-col justify-between p-6 sm:p-10">
              {/* Background Image with Dark Glamour Gradients */}
              <Image
                src={heroImage}
                alt="MUVERA Midnight Glamour Editorial"
                fill
                priority
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-surface-base/90 via-surface-base/40 to-transparent" />

              {/* Top Tag Pills */}
              <div className="relative z-10 flex items-center justify-between w-full flex-wrap gap-2">
                {heroTagBadge && (
                  <div className="flex items-center gap-1.5 bg-secondary/90 backdrop-blur-md px-3 py-1 rounded-full shadow-md">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span className="text-[11px] font-black uppercase text-white tracking-wider">
                      {heroTagBadge}
                    </span>
                  </div>
                )}
                {heroSecondaryBadge && (
                  <span className="bg-surface-base/80 backdrop-blur-md text-primary text-[11px] font-bold px-3 py-1 rounded-full border border-primary/30 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {heroSecondaryBadge}
                  </span>
                )}
              </div>

              {/* Hero Headlines & CTA */}
              <div className="relative z-10 max-w-xl space-y-3 mt-auto">
                {heroEyebrow && (
                  <span className="text-xs font-headline font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                    <Zap className="w-4 h-4 fill-current text-primary" />
                    {heroEyebrow}
                  </span>
                )}
                <h1 className="font-headline font-black text-3xl sm:text-5xl text-text-primary leading-tight drop-shadow-md">
                  {heroTitleLine1}<br />
                  <span className="text-primary">{heroTitleLine2}</span>
                </h1>
                {heroSubtitle && (
                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                    {heroSubtitle}
                  </p>
                )}

                <div className="flex items-center gap-4 pt-2">
                  <Link
                    href={heroCtaLink}
                    className="bg-primary hover:bg-primary-hover text-surface-base px-6 py-3 rounded-full font-headline font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_4px_24px_rgba(250,204,21,0.35)] transition-all active:scale-95"
                  >
                    <span>{heroCtaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  {heroDeliveryTicker && (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Timer className="w-4 h-4 text-primary" />
                      <span>{heroDeliveryTicker}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Categories Quick Filter Chips */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Curated Collections
          </span>
          <Link href="/categories" className="text-xs font-bold text-primary hover:underline">
            View All
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {siteConfig.categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="flex-shrink-0 bg-surface-card hover:bg-surface-raised border border-surface-border hover:border-primary/50 px-3.5 py-1.5 rounded-full text-xs font-headline font-bold text-text-primary tracking-wide transition-all shadow-sm whitespace-nowrap"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Deal of the Hour Lightning Card */}
      {dealOfTheHour && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="relative bg-gradient-to-r from-secondary-container via-surface-card to-surface-raised p-4 sm:p-6 rounded-2xl border border-secondary/40 shadow-xl overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-primary">
                  <Flame className="w-4 h-4 fill-current animate-bounce" />
                  <span className="font-headline font-black text-sm uppercase tracking-wider text-text-primary">
                    Deal of the Hour
                  </span>
                  <span className="bg-secondary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    50% OFF
                  </span>
                </div>
                <h3 className="font-headline font-black text-lg sm:text-xl text-text-primary">
                  {dealOfTheHour.title}
                </h3>
                <p className="text-xs text-text-muted">
                  Limited inventory allocated at Indiranagar Dark Store. Only 6 units remaining at this price!
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Link
                  href={`/product/${dealOfTheHour.slug}`}
                  className="bg-primary hover:bg-primary-hover text-surface-base font-headline font-extrabold text-xs px-5 py-2.5 rounded-full shadow-gold-glow flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span>Grab Deal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Curated Category Visual Grid */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-headline font-black text-xl text-text-primary">Curated Collections</h2>
            <p className="text-xs text-text-muted">High-energy streetwear lines</p>
          </div>
          <Link href="/categories" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {siteConfig.categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group relative h-40 rounded-2xl overflow-hidden border border-surface-border hover:border-primary/50 transition-all duration-300"
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                className="object-cover object-center group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/40 to-transparent" />
              <div className="absolute bottom-2.5 left-2.5 right-2.5">
                <h3 className="font-headline font-black text-xs text-text-primary leading-tight group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
                <span className="text-[10px] text-text-muted font-bold">{cat.count} Fits</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Trending Nocturne Blitz Drops (PLP Grid) */}
      {blitzDrops.length > 0 && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
              <h2 className="font-headline font-black text-xl text-text-primary">Trending Blitz Drops</h2>
              <Badge variant="express">⚡ EXPRESS DISPATCH</Badge>
            </div>
            <Link href="/products" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
              <span>Browse All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {blitzDrops.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 6. All Streetwear Catalog Rail */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-headline font-black text-xl text-text-primary">Fresh Streetwear Releases</h2>
            <p className="text-xs text-text-muted">Exclusive MUVERA drops • Crafted in limited batches with ultra-dense fabrics</p>
          </div>
          <Link href="/products" className="text-xs font-bold text-primary hover:underline">
            View All
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 px-4 bg-surface-card rounded-2xl border border-surface-border space-y-3">
            <Sparkles className="w-8 h-8 text-primary mx-auto opacity-40" />
            <h3 className="font-headline font-bold text-base text-text-primary">New Collection Dropping Soon</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Our latest exclusive streetwear releases are currently being prepared for dispatch. Check back shortly!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
