import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { ProductCard } from '@/components/store/ProductCard';
import { siteConfig } from '@/config/site';
import { Zap, ArrowRight, Timer, Sparkles, Flame, ShieldCheck, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function HomePage() {
  const products = await db.getProducts();
  const blitzDrops = products.filter((p) => p.isBlitzDrop);
  const dealOfTheHour = products.find((p) => p.isDealOfTheHour) || products[0];

  return (
    <div className="pb-16 space-y-8">
      {/* 1. Hero Drop Banner (Theatrical Midnight Glamour) */}
      <section className="max-w-7xl mx-auto px-4 pt-2">
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-surface-raised shadow-2xl border border-surface-border">
          <div className="relative h-[380px] sm:h-[460px] w-full flex flex-col justify-between p-6 sm:p-10">
            {/* Background Image with Dark Glamour Gradients */}
            <Image
              src="https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&auto=format&fit=crop&q=80"
              alt="MUVERA Midnight Glamour Editorial"
              fill
              priority
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface-base/90 via-surface-base/40 to-transparent" />

            {/* Top Tag Pills */}
            <div className="relative z-10 flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-secondary/90 backdrop-blur-md px-3 py-1 rounded-full shadow-md">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span className="text-[11px] font-black uppercase text-white tracking-wider">
                  Blitz Drop 04
                </span>
              </div>
              <span className="bg-surface-base/80 backdrop-blur-md text-primary text-[11px] font-bold px-3 py-1 rounded-full border border-primary/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Try &amp; Buy Available
              </span>
            </div>

            {/* Hero Headlines & CTA */}
            <div className="relative z-10 max-w-xl space-y-3 mt-auto">
              <span className="text-xs font-headline font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-current text-primary" />
                Instant Nightlife Glamour
              </span>
              <h1 className="font-headline font-black text-3xl sm:text-5xl text-text-primary leading-tight drop-shadow-md">
                PARTY TONIGHT?<br />
                <span className="text-primary">DELIVERED IN 60 MINS</span>
              </h1>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Curated streetwear, satin club edits & statement kicks delivered straight to your door before the pre-drinks end.
              </p>

              <div className="flex items-center gap-4 pt-2">
                <Link
                  href="/products"
                  className="bg-primary hover:bg-primary-hover text-surface-base px-6 py-3 rounded-full font-headline font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_4px_24px_rgba(250,204,21,0.35)] transition-all active:scale-95"
                >
                  <span>Explore Drops</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Timer className="w-4 h-4 text-primary" />
                  <span>Rider departs in 8m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Top Brands Marquee */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Powered By Official Labels
          </span>
          <span className="text-xs font-semibold text-primary">50+ Official Drops</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {siteConfig.brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/products?brand=${brand.slug}`}
              className="flex-shrink-0 bg-surface-card hover:bg-surface-raised border border-surface-border hover:border-primary/40 px-4 py-2 rounded-xl text-xs font-headline font-black uppercase text-text-primary tracking-wider transition-all duration-200 shadow-sm"
            >
              {brand.name}
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
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
            <h2 className="font-headline font-black text-xl text-text-primary">Trending Blitz Drops</h2>
            <Badge variant="express">⚡ 60-MIN EXPRESS</Badge>
          </div>
          <Link href="/products" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
            <span>Browse All (50+)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {blitzDrops.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
