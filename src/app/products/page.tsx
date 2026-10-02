'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/store/ProductCard';
import { siteConfig } from '@/config/site';
import { SlidersHorizontal, ArrowUpDown, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialBrand = searchParams.get('brand') || 'all';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'discount'>('featured');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(10000);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        if (d?.products) setProducts(d.products);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get('category')) setSelectedCategory(searchParams.get('category')!);
    if (searchParams.get('brand')) setSelectedBrand(searchParams.get('brand')!);
  }, [searchParams]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Category
        if (selectedCategory !== 'all' && product.categorySlug !== selectedCategory) {
          return false;
        }
        // Brand
        if (selectedBrand !== 'all' && product.brandSlug !== selectedBrand) {
          return false;
        }
        // Size
        if (selectedSize !== 'all') {
          const hasSize = product.variants.some((v) => v.size === selectedSize);
          if (!hasSize) return false;
        }
        // Price (paise to rupees)
        if (product.sellingPricePaise / 100 > maxPrice) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.sellingPricePaise - b.sellingPricePaise;
        if (sortBy === 'price-desc') return b.sellingPricePaise - a.sellingPricePaise;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'discount') return b.discountPercentage - a.discountPercentage;
        return 0; // featured
      });
  }, [selectedCategory, selectedBrand, selectedSize, maxPrice, sortBy]);

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedSize('all');
    setMaxPrice(10000);
    setSortBy('featured');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' || selectedBrand !== 'all' || selectedSize !== 'all' || maxPrice < 10000;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-white">
            {selectedCategory !== 'all'
              ? siteConfig.categories.find((c) => c.slug === selectedCategory)?.name || 'Catalog'
              : selectedBrand !== 'all'
              ? siteConfig.brands.find((b) => b.slug === selectedBrand)?.name || 'Brand Drops'
              : 'All MUVERA Drops'}
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Showing <strong className="text-text-primary font-mono">{filteredProducts.length}</strong> drops available with 60-min express fulfillment
          </p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Filter Drawer Toggle */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-colors ${
              hasActiveFilters
                ? 'bg-primary text-surface-base border-primary shadow-gold-glow'
                : 'bg-surface-card border-surface-border text-text-primary hover:border-primary/50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters {hasActiveFilters && '• Active'}</span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface-card border border-surface-border text-text-primary text-xs font-bold rounded-full px-4 py-2 pr-8 appearance-none focus:outline-none focus:border-primary cursor-pointer hover:border-primary/50 transition-colors"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="discount">Biggest Savings</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-text-muted absolute right-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Category Quick Filter Chips Rail */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-headline font-bold transition-all shadow-sm whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-primary text-surface-base font-black shadow-gold-glow'
              : 'bg-surface-card hover:bg-surface-raised border border-surface-border text-text-primary'
          }`}
        >
          All Drops
        </button>
        {siteConfig.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.slug)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-headline font-bold transition-all shadow-sm whitespace-nowrap ${
              selectedCategory === c.slug
                ? 'bg-primary text-surface-base font-black shadow-gold-glow'
                : 'bg-surface-card hover:bg-surface-raised border border-surface-border text-text-primary'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Expandable Filter Drawer */}
      {isFilterOpen && (
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-5 animate-in fade-in duration-200 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <h3 className="font-headline font-bold text-sm text-text-primary">Refine Fits</h3>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Reset All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Category Select */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-text-muted mb-2 block">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-surface-raised border border-surface-border text-text-primary text-xs rounded-xl p-2.5 focus:outline-none focus:border-primary"
              >
                <option value="all">All Categories</option>
                {siteConfig.categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Size Filter Pills */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-text-muted mb-2 block">
                Size
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'S', 'M', 'L', 'XL'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors ${
                      selectedSize === size
                        ? 'bg-primary text-surface-base shadow-gold-glow'
                        : 'bg-surface-raised text-text-surface hover:bg-surface-bright border border-surface-border'
                    }`}
                  >
                    {size === 'all' ? 'All' : size}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Price Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-text-muted">
                  Max Price
                </label>
                <span className="text-xs font-mono font-bold text-primary">₹{maxPrice}</span>
              </div>
              <input
                type="range"
                min="999"
                max="10000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-primary bg-surface-raised cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-text-muted font-bold text-[11px] mr-1">Active Filters:</span>
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1.5 bg-surface-card border border-surface-border px-2.5 py-1 rounded-full text-text-primary text-xs font-medium whitespace-nowrap shadow-sm">
              <span>Category: {siteConfig.categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}</span>
              <button
                onClick={() => setSelectedCategory('all')}
                aria-label="Remove category filter"
                className="hover:text-red-400 p-0.5 rounded-full hover:bg-surface-raised transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedSize !== 'all' && (
            <span className="inline-flex items-center gap-1.5 bg-surface-card border border-surface-border px-2.5 py-1 rounded-full text-text-primary text-xs font-medium whitespace-nowrap shadow-sm">
              <span>Size: {selectedSize}</span>
              <button
                onClick={() => setSelectedSize('all')}
                aria-label="Remove size filter"
                className="hover:text-red-400 p-0.5 rounded-full hover:bg-surface-raised transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {maxPrice < 10000 && (
            <span className="inline-flex items-center gap-1.5 bg-surface-card border border-surface-border px-2.5 py-1 rounded-full text-text-primary text-xs font-medium whitespace-nowrap shadow-sm">
              <span>Under ₹{maxPrice}</span>
              <button
                onClick={() => setMaxPrice(10000)}
                aria-label="Remove price filter"
                className="hover:text-red-400 p-0.5 rounded-full hover:bg-surface-raised transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-[11px] font-bold text-primary hover:underline ml-1.5 whitespace-nowrap"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-text-muted">Loading live drops from database...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-surface-card rounded-2xl border border-surface-border space-y-4">
          <p className="text-base text-white font-headline font-bold">No drops found matching these filters</p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Try adjusting your price range or clearing category filters to explore available drops.
          </p>
          <Button onClick={clearAllFilters} variant="outline" size="sm">
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-xs text-text-muted">Loading streetwear catalog...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
