'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product, Variant, SizeOption } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { siteConfig } from '@/config/site';
import { Plus, CheckCircle, Upload, X, Star, Layers, Boxes, Images } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('MUVERA');
  const [category, setCategory] = useState('Oversized Tees');
  const [mrp, setMrp] = useState(2999);
  const [sellingPrice, setSellingPrice] = useState(1799);
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [skuPrefix, setSkuPrefix] = useState('');

  // Per-size SKU & initial stock configuration
  const [sizeConfig, setSizeConfig] = useState<{ [sz: string]: { enabled: boolean; stock: number } }>({
    S: { enabled: true, stock: 10 },
    M: { enabled: true, stock: 15 },
    L: { enabled: true, stock: 20 },
    XL: { enabled: true, stock: 10 },
    XXL: { enabled: false, stock: 5 },
  });

  // Cloudinary upload state
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-generate suggested SKU Prefix when title changes
  const handleTitleChange = (val: string) => {
    setTitle(val);
    const words = val.trim().split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const suggested = words.map(w => w.slice(0, 3).toUpperCase()).join('-').slice(0, 10);
      setSkuPrefix(prev => (prev === '' || prev.length <= 4 ? suggested : prev));
    }
  };

  /** Upload multiple selected files directly to Cloudinary */
  const handleImagesUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadCount(fileArray.length);
    setUploadError('');

    try {
      // 1. Get upload signature from server
      const sigRes = await fetch('/api/admin/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: 'muvera/products',
          adminSecret: 'muvera_admin_master_secret_2026',
        }),
      });
      const sig = await sigRes.json();
      if (!sig.success) throw new Error(sig.error || 'Signature generation failed');

      // 2. Upload all selected files concurrently
      const uploadPromises = fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', sig.apiKey);
        formData.append('timestamp', String(sig.timestamp));
        formData.append('signature', sig.signature);
        formData.append('folder', sig.folder);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
          { method: 'POST', body: formData }
        );
        const uploadData = await uploadRes.json();
        if (uploadData.error) throw new Error(uploadData.error.message);
        return uploadData.secure_url as string;
      });

      const newUrls = await Promise.all(uploadPromises);
      setImageUrls((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Check Cloudinary credentials.');
    } finally {
      setUploading(false);
      setUploadCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    setImageUrls((prev) => {
      const target = prev[indexToPrimary];
      const rest = prev.filter((_, idx) => idx !== indexToPrimary);
      return [target, ...rest];
    });
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (imageUrls.length === 0) {
      alert('Please upload at least one product photo!');
      return;
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const selectedSizes = Object.entries(sizeConfig)
      .filter(([_, cfg]) => cfg.enabled)
      .map(([sz, cfg]) => ({ size: sz as SizeOption, stock: cfg.stock }));

    if (selectedSizes.length === 0) {
      alert('Please enable at least one size variant!');
      return;
    }

    const basePrefix = skuPrefix.trim() ? skuPrefix.trim().toUpperCase() : title.slice(0, 3).toUpperCase();
    const variants: Variant[] = selectedSizes.map(({ size, stock }) => ({
      id: `var_${basePrefix.toLowerCase()}_${size.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      sku: `${basePrefix}-${size}`.toUpperCase(),
      size,
      color: 'Obsidian Black',
      colorHex: '#0E0E10',
      pricePaise: sellingPrice * 100,
      mrpPaise: mrp * 100,
      initialStock: stock,
    } as any));

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
      images: imageUrls.map((url, order) => ({
        url,
        alt: `${title} - View ${order + 1}`,
        order,
      })),
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

    setFeedback(`Product "${title}" created with ${imageUrls.length} photos & ${variants.length} SKUs!`);
    setTimeout(() => setFeedback(''), 3500);
    setIsModalOpen(false);
    loadProducts();

    // Reset
    setTitle('');
    setDescription('');
    setImageUrls([]);
    setUploadError('');
    setSkuPrefix('');
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
          <p className="text-xs text-text-muted mt-0.5">Manage products, multi-photo lookbooks, automated SKU matrix per size &amp; pricing</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="sm">
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Button>
      </div>

      {/* Search */}
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
                <th className="p-4 text-center">Variants &amp; SKUs</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-12 rounded-lg overflow-hidden bg-surface-raised flex-shrink-0">
                        <Image src={p.images[0]?.url || 'https://res.cloudinary.com/ha2fbiwt/image/upload/v1/muvera/products/placeholder'} alt={p.title} fill className="object-cover" />
                        {p.images && p.images.length > 1 && (
                          <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] font-bold px-1 rounded-tl text-white">
                            {p.images.length}
                          </span>
                        )}
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
                    <div className="flex flex-wrap items-center justify-center gap-1 max-w-[220px] mx-auto">
                      {p.variants.map((v) => (
                        <span key={v.sku} className="font-mono text-[10px] font-bold bg-surface-raised px-1.5 py-0.5 rounded border border-surface-border whitespace-nowrap inline-flex items-center" title={`${v.size}: ${v.sku}`}>
                          {v.sku}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/product/${p.slug}`} className="text-primary hover:underline font-bold text-xs" target="_blank">
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
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-surface-border">
              <h3 className="font-headline font-bold text-base text-text-primary">Add New Fashion Product</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-text-muted mb-1 block">Product Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Nocturne Heavyweight Satin Bomber"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Brand *</label>
                  <select value={brand} onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary">
                    {siteConfig.brands.map((b) => <option key={b.slug} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Category *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary">
                    {siteConfig.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">MRP (₹) *</label>
                  <input type="number" required value={mrp} onChange={(e) => setMrp(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono" />
                </div>
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Selling Price (₹) *</label>
                  <input type="number" required value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono" />
                </div>
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Description *</label>
                <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fabric composition, silhouette, styling notes..."
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary" />
              </div>

              {/* Multi-Photo Cloudinary Upload Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-text-muted flex items-center gap-1.5">
                    <Images className="w-3.5 h-3.5 text-primary" />
                    <span>Product Photos (Upload Multiple) *</span>
                  </label>
                  <span className="text-[10px] text-text-muted">
                    {imageUrls.length} {imageUrls.length === 1 ? 'photo' : 'photos'} added
                  </span>
                </div>

                {/* Uploaded Photos Grid */}
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-surface-raised border border-surface-border">
                    {imageUrls.map((url, idx) => (
                      <div
                        key={url}
                        className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-card border-2 group transition-all ${
                          idx === 0 ? 'border-primary shadow-gold-glow' : 'border-surface-border'
                        }`}
                      >
                        <Image src={url} alt={`Upload ${idx + 1}`} fill className="object-cover" />

                        {/* Primary Badge */}
                        <div className="absolute top-1.5 left-1.5 z-10">
                          {idx === 0 ? (
                            <span className="bg-primary text-surface-base text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow">
                              Cover
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              title="Set as Main Cover Photo"
                              className="bg-black/70 hover:bg-primary hover:text-surface-base text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm transition-colors opacity-80 group-hover:opacity-100 flex items-center gap-0.5"
                            >
                              <Star className="w-2.5 h-2.5 fill-current" /> Set Cover
                            </button>
                          )}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          title="Remove photo"
                          className="absolute top-1.5 right-1.5 z-10 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-1 transition-all opacity-80 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>

                        <div className="absolute bottom-1 right-1.5 text-[9px] font-mono text-white/80 bg-black/60 px-1 rounded">
                          #{idx + 1}
                        </div>
                      </div>
                    ))}

                    {/* Add More Photos compact button */}
                    <div
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className="aspect-[3/4] rounded-xl border-2 border-dashed border-surface-border hover:border-primary bg-surface-card hover:bg-surface-raised flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-text-muted p-2 text-center"
                    >
                      <Plus className="w-5 h-5 text-primary" />
                      <span className="text-[10px] font-bold">Add More</span>
                    </div>
                  </div>
                )}

                {/* Initial Empty Upload Dropzone */}
                {imageUrls.length === 0 && (
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`w-full h-36 rounded-2xl border-2 border-dashed border-surface-border bg-surface-raised hover:border-primary transition-all flex flex-col items-center justify-center gap-2 text-text-muted p-4 text-center ${
                      uploading ? 'cursor-wait' : 'cursor-pointer hover:bg-surface-raised/80'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-text-primary">
                          Uploading {uploadCount} {uploadCount === 1 ? 'photo' : 'photos'} to Cloudinary...
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-primary" />
                        <div>
                          <p className="text-xs font-bold text-text-primary">Click to select product photos</p>
                          <p className="text-[11px] text-text-muted mt-0.5">Select multiple photos at once (Front, Back, Detail, Flat Lay)</p>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted bg-surface-card px-2 py-0.5 rounded border border-surface-border">
                          JPG, PNG, WEBP · Max 10MB per image
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Hidden multiple file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImagesUpload(e.target.files);
                    }
                  }}
                />

                {uploadError && (
                  <p className="text-red-400 text-[11px] mt-1.5 flex items-center gap-1">
                    <X className="w-3 h-3 flex-shrink-0" /> {uploadError}
                  </p>
                )}
              </div>

              {/* SKU Base Code & Per-Size Stock Matrix */}
              <div className="space-y-3 p-4 rounded-2xl bg-surface-raised border border-surface-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-text-primary block">SKU Base Code / Prefix *</label>
                    <p className="text-[11px] text-text-muted">
                      Unique prefix for this product&apos;s variants (e.g. <span className="font-mono text-primary font-bold">{(skuPrefix || 'NOC-BOM')}-S</span>, <span className="font-mono text-primary font-bold">{(skuPrefix || 'NOC-BOM')}-M</span>)
                    </p>
                  </div>
                  <input
                    type="text"
                    required
                    value={skuPrefix}
                    onChange={(e) => setSkuPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="e.g. NOC-BOM"
                    className="bg-surface-card border border-surface-border rounded-xl px-3 py-1.5 text-xs text-text-primary font-mono font-bold max-w-[160px] focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-2 border-t border-surface-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-text-muted">Select Sizes &amp; Initial Stock Units</label>
                    <span className="text-[10px] text-text-muted">Each size gets a distinct SKU &amp; inventory count</span>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(sizeConfig).map(([sz, cfg]) => {
                      const fullSku = `${(skuPrefix || 'SKU')}-${sz}`;
                      return (
                        <div
                          key={sz}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            cfg.enabled
                              ? 'bg-surface-card border-surface-border shadow-sm'
                              : 'bg-surface-card/40 border-transparent opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`sz-${sz}`}
                              checked={cfg.enabled}
                              onChange={(e) =>
                                setSizeConfig((prev) => ({
                                  ...prev,
                                  [sz]: { ...prev[sz], enabled: e.target.checked },
                                }))
                              }
                              className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                            />
                            <label htmlFor={`sz-${sz}`} className="font-black text-xs px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 cursor-pointer">
                              Size {sz}
                            </label>
                            <span className="font-mono text-[11px] text-text-muted">
                              SKU: <strong className="text-text-primary tracking-wide">{fullSku}</strong>
                            </span>
                          </div>

                          {cfg.enabled && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-text-muted font-bold">Initial Stock:</span>
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                value={cfg.stock}
                                onChange={(e) =>
                                  setSizeConfig((prev) => ({
                                    ...prev,
                                    [sz]: { ...prev[sz], stock: Math.max(0, Number(e.target.value)) },
                                  }))
                                }
                                className="w-16 bg-surface-raised border border-surface-border rounded-lg px-2 py-1 text-center font-mono font-bold text-xs text-text-primary focus:outline-none focus:border-primary"
                              />
                              <span className="text-[10px] text-text-muted">units</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" size="sm" fullWidth>Cancel</Button>
                <Button type="submit" size="sm" fullWidth disabled={uploading || imageUrls.length === 0}>
                  {uploading ? `Uploading ${uploadCount} Photos...` : 'Save Product & SKUs'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
