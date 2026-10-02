import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '@/config/site';
import { ChevronRight } from 'lucide-react';

export default function CategoriesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">Apparel Categories</h1>
        <p className="text-xs text-text-muted mt-1">Explore all curated luxury streetwear and party lines</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {siteConfig.categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className="group relative h-48 rounded-2xl overflow-hidden border border-surface-border hover:border-primary/50 transition-all duration-300 shadow-lg"
          >
            <Image
              src={cat.image}
              alt={cat.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-surface-base/80 px-2 py-0.5 rounded-full border border-primary/20">
                  {cat.count} Fits Available
                </span>
                <h2 className="font-headline font-black text-xl text-text-primary mt-1 group-hover:text-primary transition-colors">
                  {cat.name}
                </h2>
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-card border border-surface-border flex items-center justify-center text-text-muted group-hover:text-primary group-hover:border-primary transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
