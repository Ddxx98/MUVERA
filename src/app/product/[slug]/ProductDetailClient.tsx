'use client';

import React, { useState, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/store/ProductCard';
import { SizeGuideModal } from '@/components/store/SizeGuideModal';

interface ProductDetailClientProps {
  product: Product;
  similarProducts: Product[];
}

export function ProductDetailClient({ product, similarProducts }: ProductDetailClientProps) {
  const { addToCart, toggleWishlist, isWishlisted, siteSettings } = useStore();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  const handleGalleryScroll = () => {
    if (!galleryRef.current) return;
    const { scrollLeft, clientWidth } = galleryRef.current;
    if (clientWidth > 0) {
      const newIndex = Math.round(scrollLeft / clientWidth);
      if (newIndex !== selectedImageIndex) {
        setSelectedImageIndex(newIndex);
      }
    }
  };

  const scrollToImage = (index: number) => {
    if (!galleryRef.current) return;
    const totalImages = product.images?.length || 1;
    const targetIndex = Math.max(0, Math.min(index, totalImages - 1));
    galleryRef.current.scrollTo({
      left: targetIndex * galleryRef.current.clientWidth,
      behavior: 'smooth',
    });
    setSelectedImageIndex(targetIndex);
  };

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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
      {/* Toast Notification */}
      {showNotification && (
        <div className="fixed top-20 right-4 z-50 bg-primary text-surface-base px-4 py-2.5 rounded-full font-headline font-black text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle className="w-4 h-4" />
          <span>Added {product.title} ({selectedVariant.size}) to Bag!</span>
        </div>
      )}

      {/* Main Grid: Gallery & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Main Hero Swipeable Gallery */}
          <div className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[4/5] w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-surface-raised border border-surface-border shadow-2xl group">
            {/* Horizontal Scroll Snap Track */}
            <div
              ref={galleryRef}
              onScroll={handleGalleryScroll}
              className="w-full h-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-y touch-pan-x select-none"
            >
              {product.images && product.images.length > 0 ? (
                product.images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setIsLightboxOpen(true)}
                    className="relative w-full h-full flex-shrink-0 snap-center snap-always cursor-zoom-in"
                  >
                    <Image
                      src={img.url}
                      alt={`${product.title} - View ${idx + 1}`}
                      fill
                      priority={idx === 0}
                      sizes="(max-width: 768px) 100vw, 55vw"
                      className="object-cover object-center"
                      draggable={false}
                    />
                  </div>
                ))
              ) : (
                <div className="relative w-full h-full flex-shrink-0">
                  <Image
                    src="https://res.cloudinary.com/ha2fbiwt/image/upload/v1/muvera/products/placeholder"
                    alt={product.title}
                    fill
                    priority
                    className="object-cover object-center"
                  />
                </div>
              )}
            </div>

            {/* Top Tag Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-20 pointer-events-none">
              {product.isBlitzDrop && <Badge variant="blitz">🔥 Blitz Drop</Badge>}
              {product.discountPercentage > 0 && (
                <Badge variant="discount">-{product.discountPercentage}% OFF</Badge>
              )}
            </div>

            {/* Action Buttons: Zoom & Wishlist */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                aria-label="View large images fullscreen"
                className="w-10 h-10 rounded-full bg-surface-base/80 backdrop-blur-md flex items-center justify-center text-text-surface hover:text-text-primary transition-all active:scale-90"
              >
                <Maximize2 className="w-4 h-4 text-text-muted hover:text-primary transition-colors" />
              </button>

              <button
                onClick={() => toggleWishlist(product.id)}
                aria-label="Wishlist"
                className="w-10 h-10 rounded-full bg-surface-base/80 backdrop-blur-md flex items-center justify-center text-text-surface hover:text-text-primary transition-all active:scale-90"
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    favorited ? 'fill-secondary text-secondary' : 'text-text-muted hover:text-secondary'
                  }`}
                />
              </button>
            </div>

            {/* Desktop Next/Previous Chevrons & Bottom Dots */}
            {product.images && product.images.length > 1 && (
              <>
                {selectedImageIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => scrollToImage(selectedImageIndex - 1)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 active:scale-95 shadow-xl"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {selectedImageIndex < product.images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => scrollToImage(selectedImageIndex + 1)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 active:scale-95 shadow-xl"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                {/* Floating Dot Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-auto">
                  {product.images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => scrollToImage(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        selectedImageIndex === idx ? 'w-5 bg-primary' : 'w-1.5 bg-white/50 hover:bg-white/90'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Rail */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToImage(idx)}
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
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24 h-fit">
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
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`py-2.5 rounded-xl font-headline font-bold text-sm border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-primary bg-primary text-surface-base shadow-gold-glow'
                          : 'border-surface-border bg-surface-raised hover:bg-surface-card text-text-surface'
                      }`}
                    >
                      <span>{v.size}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="pt-2">
            <Button onClick={handleAddToCart} size="lg" fullWidth>
              <span>Add to Bag</span>
              <span className="font-mono text-xs opacity-75">
                • {formatPaise(selectedVariant.pricePaise || product.sellingPricePaise)}
              </span>
            </Button>
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
                <span>Authenticity &amp; Quality Guarantee</span>
                <ChevronDown className="w-4 h-4 text-text-muted group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-3 text-text-muted space-y-1 leading-relaxed">
                <p>• 100% genuine luxury streetwear crafted with premium heavyweight fabrics.</p>
                <p>• Multi-point quality inspection verified prior to courier dispatch.</p>
                <p>• Dedicated VIP concierge support directly available on WhatsApp.</p>
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

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        selectedSize={selectedVariant?.size}
      />

      {/* Fullscreen High-Resolution Image Lightbox */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-in fade-in duration-200">
          {/* Lightbox Top Header */}
          <div className="flex items-center justify-between z-20 pb-2 border-b border-white/10">
            <div>
              <h3 className="font-headline font-bold text-sm sm:text-base text-white line-clamp-1">
                {product.title}
              </h3>
              <p className="text-xs text-zinc-400">
                Fit View {selectedImageIndex + 1} of {product.images?.length || 1} • High-Resolution Inspection
              </p>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close fullscreen view"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Large Image Frame */}
          <div className="relative flex-1 w-full max-w-4xl mx-auto my-auto flex items-center justify-center min-h-[50vh]">
            {product.images && product.images[selectedImageIndex] ? (
              <Image
                src={product.images[selectedImageIndex].url}
                alt={`${product.title} - Large View ${selectedImageIndex + 1}`}
                fill
                sizes="100vw"
                quality={95}
                className="object-contain object-center"
              />
            ) : (
              <Image
                src="https://res.cloudinary.com/ha2fbiwt/image/upload/v1/muvera/products/placeholder"
                alt={product.title}
                fill
                className="object-contain object-center"
              />
            )}

            {/* Previous / Next Chevrons */}
            {product.images && product.images.length > 1 && (
              <>
                {selectedImageIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => scrollToImage(selectedImageIndex - 1)}
                    aria-label="Previous large image"
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all active:scale-95 shadow-2xl border border-white/10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                {selectedImageIndex < product.images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => scrollToImage(selectedImageIndex + 1)}
                    aria-label="Next large image"
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all active:scale-95 shadow-2xl border border-white/10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto py-2 z-20 no-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToImage(idx)}
                  className={`relative w-14 h-16 sm:w-16 sm:h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImageIndex === idx ? 'border-primary scale-105' : 'border-white/20 opacity-50 hover:opacity-100'
                  }`}
                >
                  <Image src={img.url} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
