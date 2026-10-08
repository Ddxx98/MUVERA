'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product, Variant } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { useStore } from '@/lib/store-context';
import {
  Heart,
  Truck,
  RotateCcw,
  Sparkles,
  Star,
  MapPin,
  CheckCircle,
  ChevronDown,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/store/ProductCard';

interface ProductDetailClientProps {
  product: Product;
  similarProducts: Product[];
}

export function ProductDetailClient({ product, similarProducts }: ProductDetailClientProps) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<Variant>(
    product.variants[0] || ({} as Variant)
  );
  const [pincode, setPincode] = useState('560038');
  const [pincodeStatus, setPincodeStatus] = useState<{ checked: boolean; serviceable: boolean; eta: string }>({
    checked: true,
    serviceable: true,
    eta: '📦 Express Courier: Fast Doorstep Dispatch (2-4 Business Days)',
  });
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const favorited = isWishlisted(product.id);

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length === 6) {
      setPincodeStatus({
        checked: true,
        serviceable: true,
        eta: '📦 Express Courier Serviceable! Delivery within 2-4 business days.',
      });
    } else {
      setPincodeStatus({
        checked: true,
        serviceable: false,
        eta: '⚠️ Please enter a valid 6-digit Indian postal pincode.',
      });
    }
  };

  const handleAddToCart = () => {
    addToCart(product, selectedVariant, 1);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-12">
      {/* Toast Notification */}
      {showNotification && (
        <div className="fixed top-20 right-4 z-50 bg-primary text-surface-base px-4 py-2.5 rounded-full font-headline font-black text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle className="w-4 h-4" />
          <span>Added {product.title} ({selectedVariant.size}) to Bag!</span>
        </div>
      )}

      {/* Main Grid: Gallery & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Main Hero Image */}
          <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-surface-raised border border-surface-border shadow-2xl">
            <Image
              src={product.images[selectedImageIndex]?.url || product.images[0]?.url || 'https://res.cloudinary.com/ha2fbiwt/image/upload/v1/muvera/products/placeholder'}
              alt={product.title}
              fill
              priority
              className="object-cover object-center"
            />
            {/* Top Tag Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {product.isBlitzDrop && <Badge variant="blitz">🔥 Blitz Drop</Badge>}
              {product.discountPercentage > 0 && (
                <Badge variant="discount">-{product.discountPercentage}% OFF</Badge>
              )}
            </div>

            {/* Wishlist Heart */}
            <button
              onClick={() => toggleWishlist(product.id)}
              aria-label="Wishlist"
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-surface-base/80 backdrop-blur-md flex items-center justify-center text-text-surface hover:text-text-primary transition-all active:scale-90"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  favorited ? 'fill-secondary text-secondary' : 'text-text-muted hover:text-secondary'
                }`}
              />
            </button>
          </div>

          {/* Thumbnail Rail */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-24 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImageIndex === idx
                      ? 'border-primary shadow-gold-glow'
                      : 'border-surface-border opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={img.url} alt={`Thumbnail ${idx}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Details & Purchase Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Brand & Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Link
                href={`/products?brand=${product.brandSlug || product.brand}`}
                className="text-xs font-black uppercase tracking-widest text-primary hover:underline"
              >
                {product.brand}
              </Link>
              <div className="flex items-center gap-1 bg-surface-card px-2 py-0.5 rounded-full border border-surface-border text-xs font-bold text-amber-400">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{product.rating || 4.9}</span>
                <span className="text-text-muted">({product.reviewCount || 12})</span>
              </div>
            </div>

            <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary leading-tight">
              {product.title}
            </h1>
          </div>

          {/* Pricing Card */}
          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex items-baseline justify-between">
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2.5">
                <span className="font-headline font-black text-2xl sm:text-3xl text-text-primary">
                  {formatPaise(selectedVariant.pricePaise || product.sellingPricePaise)}
                </span>
                <span className="text-sm text-text-muted line-through font-semibold">
                  {formatPaise(selectedVariant.mrpPaise || product.mrpPaise)}
                </span>
                {(selectedVariant.mrpPaise || product.mrpPaise) > (selectedVariant.pricePaise || product.sellingPricePaise) && (
                  <span className="text-xs font-extrabold text-secondary uppercase bg-secondary/15 px-2 py-0.5 rounded-full">
                    Save {formatPaise((selectedVariant.mrpPaise || product.mrpPaise) - (selectedVariant.pricePaise || product.sellingPricePaise))}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted">Inclusive of all taxes &amp; GST</p>
            </div>

            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
              In Stock
            </span>
          </div>

          {/* Size Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                  Select Size: <strong className="text-primary font-black">{selectedVariant.size}</strong>
                </span>
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-primary hover:underline font-bold text-xs"
                >
                  Size Guide
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant.id === v.id || selectedVariant.sku === v.sku;
                  return (
                    <button
                      key={v.id || v.sku}
                      onClick={() => setSelectedVariant(v)}
                      className={`py-3 rounded-xl font-headline font-bold text-sm border flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'border-primary bg-primary text-surface-base shadow-gold-glow'
                          : 'border-surface-border bg-surface-raised hover:bg-surface-card text-text-surface'
                      }`}
                    >
                      <span>{v.size}</span>
                      <span className="text-[9px] font-mono mt-0.5 opacity-80">{v.color || 'Standard'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-2.5 pt-2">
            <Button onClick={handleAddToCart} size="lg" fullWidth>
              <span>Add to Bag</span>
              <span className="font-mono text-xs opacity-75">
                • {formatPaise(selectedVariant.pricePaise || product.sellingPricePaise)}
              </span>
            </Button>

            {/* Quick WhatsApp Link for this exact item */}
            <a
              href={`https://wa.me/919380933170?text=${encodeURIComponent(
                `Hi MUVERA! I want to book: ${product.title} (Size: ${selectedVariant.size || 'M'}, SKU: ${selectedVariant.sku || 'N/A'}) for ${formatPaise(selectedVariant.pricePaise || product.sellingPricePaise)}. Please confirm availability!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-headline font-bold text-xs sm:text-sm py-3 px-4 rounded-full shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Instant WhatsApp Booking</span>
            </a>
          </div>

          {/* Express Pincode Estimator */}
          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Check Pincode Delivery Serviceability</span>
            </div>

            <form onSubmit={handlePincodeCheck} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter 6-digit Pincode"
                className="flex-1 bg-surface-raised border border-surface-border rounded-xl px-3 py-2 text-xs text-text-primary font-mono font-bold focus:outline-none focus:border-primary"
              />
              <Button type="submit" variant="outline" size="sm">
                Check
              </Button>
            </form>

            {pincodeStatus.checked && (
              <div className="text-xs flex items-start gap-1.5 text-primary font-bold bg-primary/10 p-2.5 rounded-xl border border-primary/20">
                <Truck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{pincodeStatus.eta}</span>
              </div>
            )}
          </div>

          {/* Accordion Specs */}
          <div className="border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border bg-surface-card">
            <details className="p-4 text-xs group cursor-pointer" open>
              <summary className="font-bold text-text-primary flex justify-between items-center list-none">
                <span>Fabric &amp; Product Details</span>
                <ChevronDown className="w-4 h-4 text-text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-3 text-text-muted space-y-1.5 leading-relaxed">
                <p>{product.description}</p>
                {product.fabricDetails && (
                  <p className="font-bold text-text-primary pt-1">Material: {product.fabricDetails}</p>
                )}
              </div>
            </details>

            <details className="p-4 text-xs group cursor-pointer">
              <summary className="font-bold text-text-primary flex justify-between items-center list-none">
                <span>7-Day Return Guarantee</span>
                <ChevronDown className="w-4 h-4 text-text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-3 text-text-muted space-y-1 leading-relaxed">
                <p>• Hassle-free 7-day pickup window from date of delivery.</p>
                <p>• Doorstep pickup scheduled conveniently across India.</p>
                <p>• Instant UPI refund credited following return inspection.</p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Similar Drops Recommendations */}
      {similarProducts && similarProducts.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline font-black text-xl text-text-primary">Complete The Look</h2>
              <p className="text-xs text-text-muted">Frequently styled together with this drop</p>
            </div>
            <Link href="/products" className="text-xs font-bold text-primary hover:underline">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Size Guide Modal */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-headline font-bold text-lg text-text-primary">Size &amp; Fit Guide</h3>
              <button
                onClick={() => setIsSizeGuideOpen(false)}
                className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Measurements are in inches. Fits are true to standard streetwear boxy proportions.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-surface-border text-text-muted font-bold">
                    <th className="py-2">Size</th>
                    <th className="py-2">Chest (in)</th>
                    <th className="py-2">Length (in)</th>
                    <th className="py-2">Shoulder (in)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-text-primary">
                  <tr><td className="py-2 font-bold text-primary">S</td><td>42</td><td>28</td><td>20</td></tr>
                  <tr><td className="py-2 font-bold text-primary">M</td><td>44</td><td>29</td><td>21</td></tr>
                  <tr><td className="py-2 font-bold text-primary">L</td><td>46</td><td>30</td><td>22</td></tr>
                  <tr><td className="py-2 font-bold text-primary">XL</td><td>48</td><td>31</td><td>23</td></tr>
                </tbody>
              </table>
            </div>
            <Button onClick={() => setIsSizeGuideOpen(false)} variant="outline" size="sm" fullWidth>
              Got It
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
