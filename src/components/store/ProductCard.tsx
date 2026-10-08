'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product, Variant } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { useStore } from '@/lib/store-context';
import { Heart, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { toggleWishlist, isWishlisted, addToCart } = useStore();
  const [selectedVariant, setSelectedVariant] = useState<Variant>(product.variants[0] || {} as Variant);
  const [isHovered, setIsHovered] = useState(false);

  const favorited = isWishlisted(product.id);
  const primaryImage = product.images[0]?.url || 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600';
  const secondaryImage = product.images[1]?.url || primaryImage;

  const handleQuickAdd = (e: React.MouseEvent, variant: Variant) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedVariant(variant);
    addToCart(product, variant, 1);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col bg-surface-card rounded-2xl overflow-hidden border border-surface-border hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
    >
      {/* Image Frame (3:4 aspect ratio) */}
      <Link href={`/product/${product.slug}`} className="relative aspect-[3/4] w-full overflow-hidden bg-surface-raised">
        <Image
          src={isHovered ? secondaryImage : primaryImage}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1 z-10 flex-wrap max-w-[calc(100%-38px)] pointer-events-none">
          {product.isBlitzDrop && (
            <Badge variant="blitz" className="shadow-md">
              🔥 Blitz
            </Badge>
          )}
          {product.discountPercentage > 0 && (
            <Badge variant="discount" className="shadow-md">
              -{product.discountPercentage}%
            </Badge>
          )}
        </div>

        {/* Wishlist Heart Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label="Wishlist"
          className="absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-base/80 backdrop-blur-md flex items-center justify-center text-text-surface hover:text-primary transition-all duration-200 active:scale-90"
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
              favorited ? 'fill-secondary text-secondary' : 'text-text-muted hover:text-primary'
            }`}
          />
        </button>


        {/* Quick Size Selector Strip on Hover (Desktop) */}
        <div className="absolute inset-x-2 bottom-2 hidden sm:flex items-center justify-center gap-1 bg-surface-card/95 backdrop-blur-md p-1.5 rounded-xl border border-surface-border opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 shadow-lg">
          <span className="text-[10px] font-bold text-text-muted mr-1 whitespace-nowrap">ADD:</span>
          {product.variants.map((v) => (
            <button
              key={v.id}
              onClick={(e) => handleQuickAdd(e, v)}
              className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-surface-raised hover:bg-primary hover:text-surface-base text-text-primary transition-all active:scale-95 whitespace-nowrap"
            >
              {v.size}
            </button>
          ))}
        </div>
      </Link>

      {/* Product Information */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between bg-surface-card">
        <div>
          {/* Brand */}
          <p className="text-[11px] font-extrabold tracking-wider uppercase text-text-muted mb-0.5 truncate">
            {product.brand}
          </p>

          {/* Title */}
          <Link href={`/product/${product.slug}`} className="block">
            <h3 className="font-headline font-bold text-xs sm:text-sm text-text-primary line-clamp-1 group-hover:text-primary transition-colors">
              {product.title}
            </h3>
          </Link>
        </div>

        {/* Pricing in Integer Paise */}
        <div className="mt-2.5 flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-headline font-black text-sm sm:text-base text-text-primary whitespace-nowrap">
              {formatPaise(product.sellingPricePaise)}
            </span>
            {product.mrpPaise > product.sellingPricePaise && (
              <span className="text-[11px] sm:text-xs text-text-muted line-through font-semibold whitespace-nowrap truncate">
                {formatPaise(product.mrpPaise)}
              </span>
            )}
          </div>

          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap flex-shrink-0">
            In Stock
          </span>
        </div>
      </div>
    </div>
  );
}
