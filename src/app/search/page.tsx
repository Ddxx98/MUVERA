'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/store/ProductCard';
import { Search, X, Sparkles, TrendingUp, History } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        if (d?.products) setProducts(d.products);
      })
      .catch(() => {});
  }, []);

  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Oversized T-Shirts',
    'Satin Bomber',
    'Heavyweight Fleece',
    'Parachute Cargoes',
  ]);

  const trendingTags = [
    'Oversized Tees',
    'Heavyweight Hoodies',
    'Satin Bomber',
    'Club & Party Fits',
    'Tactical Cargoes',
    'Express Delivery Drops',
  ];

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [query, products]);

  const handleTagClick = (tag: string) => {
    setQuery(tag);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Search Input Bar */}
      <div className="relative flex items-center bg-surface-card border-2 border-surface-border focus-within:border-primary rounded-2xl p-2 transition-all shadow-xl">
        <div className="pl-3 pr-2 text-primary">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search MUVERA luxury streetwear, bombers, hoodies, tees..."
          autoFocus
          className="w-full bg-transparent font-headline font-bold text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Trending & Recent Tags when query is empty */}
      {!query && (
        <div className="space-y-6 py-4">
          {/* Trending Searches */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Trending Drops in Bengaluru</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="bg-surface-card hover:bg-surface-raised border border-surface-border hover:border-primary/40 text-text-surface hover:text-text-primary px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider">
              <History className="w-4 h-4 text-text-muted" />
              <span>Recent Searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="bg-surface-raised hover:bg-surface-card text-text-muted hover:text-text-primary border border-surface-border px-3 py-1 rounded-full text-xs transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Results Grid */}
      {query && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              Found <strong className="text-text-primary font-mono">{results.length}</strong> drops for "{query}"
            </span>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center bg-surface-card rounded-2xl border border-surface-border space-y-3">
              <p className="font-headline font-bold text-text-primary text-base">No matches found for "{query}"</p>
              <p className="text-xs text-text-muted">
                Try searching for &quot;Bomber&quot;, &quot;Hoodie&quot;, &quot;Cargo&quot;, or &quot;Oversized Tee&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
