import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { ChevronRight, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await db.getCategories();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">Apparel Categories</h1>
        <p className="text-xs text-text-muted mt-1">Explore all curated luxury streetwear and party lines</p>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-16 px-4 bg-surface-card rounded-2xl border border-surface-border space-y-3">
          <Sparkles className="w-8 h-8 text-primary mx-auto opacity-40" />
          <h3 className="font-headline font-bold text-base text-text-primary">No Categories Found</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Categories will appear here once configured in the admin dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id || cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group relative h-48 rounded-2xl overflow-hidden border border-surface-border hover:border-primary/50 transition-all duration-300 shadow-lg"
            >
              {cat.image ? (
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-surface-raised flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-surface-base/80 px-2 py-0.5 rounded-full border border-primary/20">
                    {cat.count ?? 0} Fits Available
                  </span>
                  <h2 className="font-headline font-black text-xl text-text-primary mt-1 group-hover:text-primary transition-colors">
                    {cat.name}
                  </h2>
                  {cat.description && (
                    <p className="text-xs text-text-muted line-clamp-1 mt-0.5">{cat.description}</p>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-surface-card border border-surface-border flex items-center justify-center text-text-muted group-hover:text-primary group-hover:border-primary transition-colors flex-shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
