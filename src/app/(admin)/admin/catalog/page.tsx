'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product, Variant, SizeOption } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { siteConfig } from '@/config/site';
import { Layers, Plus, Search, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('MUVERA SIGNATURE');
  const [category, setCategory] = useState('Oversized Tees');
  const [mrp, setMrp] = useState(2999);
  const [sellingPrice, setSellingPrice] = useState(1799);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Auto-generate variant matrix for S, M, L, XL
    const sizes: SizeOption[] = ['S', 'M', 'L', 'XL'];
    const prefix = title.slice(0, 3).toUpperCase();
    const variants: Variant[] = sizes.map((s) => ({
      id: `var_${prefix}_${s.toLowerCase()}_${Date.now()}`,
      sku: `${prefix}-${s}`,
      size: s,
      color: 'Obsidian Black',
      colorHex: '#0E0E10',
      pricePaise: sellingPrice * 100,
      mrpPaise: mrp * 100,
    }));

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      title,
      slug,
      brand,
      brandSlug,
      category,
      categorySlug,
      description,
      mrpPaise: mrp * 100,
      sellingPricePaise: sellingPrice * 100,
      discountPercentage: Math.round(((mrp - sellingPrice) / mrp) * 100),
      images: [
        {
          url: imageUrl || 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
          alt: title,
          order: 0,
        },
      ],
      variants,
      rating: 5.0,
      reviewCount: 1,
      tags: ['New Release', brand],
      createdAt: new Date().toISOString(),
    };

    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProd),
    });

    setFeedback(`Product "${title}" created with 4 size variants!`);
    setTimeout(() => setFeedback(''), 3000);
    setIsModalOpen(false);
    loadProducts();

    // Reset Form
    setTitle('');
    setDescription('');
    setImageUrl('');
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Toast */}
      {feedback && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-500 text-surface-base px-4 py-2.5 rounded-full font-headline font-bold text-xs shadow-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">Product Catalog &amp; Variants</h1>
          <p className="text-xs text-text-muted mt-0.5">Manage products, automated SKU matrix &amp; pricing</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} size="sm">
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-2xl bg-surface-card border border-surface-border">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by title or brand..."
          className="w-full bg-surface-raised border border-surface-border rounded-xl px-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary max-w-sm"
        />
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-surface-border text-text-muted font-bold uppercase tracking-wider bg-surface-raised/50">
                <th className="p-4">Product</th>
                <th className="p-4">Brand</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4 text-center">Variants</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-12 rounded-lg overflow-hidden bg-surface-raised flex-shrink-0">
                        <Image src={p.images[0]?.url} alt={p.title} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="font-headline font-bold text-text-primary text-xs">{p.title}</p>
                        <p className="text-[11px] text-text-muted font-mono">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-text-surface">{p.brand}</td>
                  <td className="p-4 text-text-muted">{p.category}</td>
                  <td className="p-4 font-mono font-bold text-text-primary">
                    {formatPaise(p.sellingPricePaise)}
                    <span className="text-[11px] text-text-muted line-through ml-1.5 font-normal">
                      {formatPaise(p.mrpPaise)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-mono text-xs font-bold bg-surface-raised px-2 py-0.5 rounded border border-surface-border">
                      {p.variants.length} SKUs
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/product/${p.slug}`}
                      className="text-primary hover:underline font-bold text-xs"
                      target="_blank"
                    >
                      View Live
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-surface-border">
              <h3 className="font-headline font-bold text-base text-text-primary">Add New Fashion Product</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-text-muted mb-1 block">Product Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Vintage Leather Moto Jacket"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Brand *</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                  >
                    {siteConfig.brands.map((b) => (
                      <option key={b.slug} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                  >
                    {siteConfig.categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    value={mrp}
                    onChange={(e) => setMrp(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fabric composition, silhouette, styling notes..."
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Image URL (Unsplash or Cloudinary)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-raised border border-surface-border text-[11px] text-text-muted">
                ⚡ Variant matrix (S, M, L, XL) with individual SKU generation will be generated automatically.
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" size="sm" fullWidth>
                  Cancel
                </Button>
                <Button type="submit" size="sm" fullWidth>
                  Save Product &amp; SKUs
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
