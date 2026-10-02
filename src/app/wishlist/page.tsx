'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/store-context';
import { initialProducts } from '@/lib/seed-data';
import { formatPaise } from '@/lib/money';
import { Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useStore();

  const savedProducts = initialProducts.filter((p) => wishlist.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="border-b border-surface-border pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">Saved Fits</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {savedProducts.length} items saved to your personal wardrobe
          </p>
        </div>
      </div>

      {savedProducts.length === 0 ? (
        <div className="py-20 text-center bg-surface-card rounded-2xl border border-surface-border max-w-md mx-auto space-y-4 p-8">
          <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center text-text-muted mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-lg text-text-primary">Your wishlist is empty</h3>
            <p className="text-xs text-text-muted mt-1">
              Explore our latest 60-min drops and tap the heart icon on any fit you want to save.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-surface-base px-6 py-3 rounded-full font-headline font-bold text-xs shadow-gold-glow transition-all active:scale-95"
          >
            <span>Explore Drops</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {savedProducts.map((product) => {
            const defaultVariant = product.variants[0];

            return (
              <div
                key={product.id}
                className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden flex flex-col justify-between group"
              >
                <div className="relative aspect-[3/4] w-full bg-surface-raised">
                  <Image
                    src={product.images[0]?.url}
                    alt={product.title}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-surface-base/80 backdrop-blur-md flex items-center justify-center text-secondary hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-text-muted">{product.brand}</p>
                    <h3 className="font-headline font-bold text-xs text-text-primary line-clamp-1">{product.title}</h3>
                    <p className="font-headline font-black text-sm text-text-primary mt-1">
                      {formatPaise(product.sellingPricePaise)}
                    </p>
                  </div>

                  <Button
                    onClick={() => addToCart(product, defaultVariant, 1)}
                    size="sm"
                    fullWidth
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Move to Bag</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
