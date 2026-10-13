'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/store-context';
import { formatPaise } from '@/lib/money';
import { env } from '@/config/env';
import { X, Plus, Minus, Trash2, Zap, ArrowRight, Tag, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CartDrawer() {
  const {
    cart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeFromCart,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    reservationTimeRemainingSeconds,
    getCartSubtotalPaise,
    getDiscountPaise,
    getDeliveryFeePaise,
    getGrandTotalPaise,
    siteSettings,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  if (!isCartDrawerOpen) return null;

  const minutes = Math.floor(reservationTimeRemainingSeconds / 60);
  const seconds = reservationTimeRemainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const subtotal = getCartSubtotalPaise();
  const discount = getDiscountPaise();
  const delivery = getDeliveryFeePaise();
  const grandTotal = getGrandTotalPaise();

  // Free shipping progress calculation using dynamic CMS threshold
  const freeShippingThreshold = siteSettings?.freeShippingThresholdPaise !== undefined
    ? siteSettings.freeShippingThresholdPaise
    : env.freeShippingThresholdPaise;
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput) return;
    setIsApplying(true);
    setCouponError('');
    const result = await applyCoupon(couponInput);
    if (!result.success) {
      setCouponError(result.message);
    } else {
      setCouponInput('');
    }
    setIsApplying(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartDrawerOpen(false)}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface-card border-l border-surface-border flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface-raised/60">
            <div className="flex items-center gap-2">
              <h2 className="font-headline font-bold text-lg text-text-primary">Your Bag</h2>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-primary text-surface-base">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stock Reservation Hold Banner */}
          {cart.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-surface-card to-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-primary font-bold">
                <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>Stock Held for You:</span>
              </div>
              <span className="font-mono font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                {timeFormatted} min
              </span>
            </div>
          )}

          {/* Free Shipping Progress Bar */}
          {cart.length > 0 && (
            <div className="px-4 py-2.5 bg-surface-raised border-b border-surface-border">
              <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                {amountNeededForFreeShipping === 0 ? (
                  <span className="text-primary flex items-center gap-1">
                    🎉 Free Express Delivery Unlocked!
                  </span>
                ) : (
                  <span className="text-text-surface">
                    Add <strong className="text-primary">{formatPaise(amountNeededForFreeShipping)}</strong> more for FREE Express Delivery
                  </span>
                )}
                <span className="text-text-muted font-mono">{freeShippingProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-card rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 shadow-gold-glow"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center text-text-muted">
                  <X className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-lg text-text-primary">Your bag is empty</h3>
                  <p className="text-xs text-text-muted mt-1 max-w-xs">
                    Explore our latest curated drops and party fits to fill your bag.
                  </p>
                </div>
                <Button
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="text-xs font-bold px-6"
                >
                  Explore Drops
                </Button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-3 p-3 rounded-xl bg-surface-card border border-surface-border"
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-surface-raised flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover object-center"
                    />
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase text-text-muted">
                            {item.brand}
                          </p>
                          <h4 className="font-headline font-bold text-xs text-text-primary line-clamp-1">
                            {item.title}
                          </h4>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.variantId)}
                          className="text-text-muted hover:text-red-400 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold bg-surface-raised px-1.5 py-0.5 rounded text-text-surface border border-surface-border">
                          Size: {item.size}
                        </span>
                        <span className="text-[10px] text-text-muted truncate max-w-[5.5rem]">
                          {item.color}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {/* Quantity Toggles */}
                      <div className="flex items-center gap-1.5 bg-surface-raised rounded-full px-2 py-0.5 border border-surface-border">
                        <button
                          onClick={() => updateQuantity(item.variantId, -1)}
                          className="text-text-muted hover:text-text-primary p-0.5 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold px-1.5 text-text-primary">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.variantId, 1)}
                          className="text-text-muted hover:text-text-primary p-0.5 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <span className="font-headline font-black text-sm text-text-primary">
                        {formatPaise(item.sellingPricePaise * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-surface-border bg-surface-raised/80 space-y-3">
              {/* Coupon Engine */}
              <div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{appliedCoupon.code} applied (-{formatPaise(discount)})</span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-xs text-text-muted hover:text-text-primary underline font-semibold transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Coupon Code (e.g. WELCOME10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-surface-card border border-surface-border rounded-xl px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary uppercase font-mono font-bold"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={isApplying || !couponInput}
                    >
                      Apply
                    </Button>
                  </form>
                )}
                {couponError && <p className="text-[11px] text-red-400 mt-1">{couponError}</p>}
              </div>

              {/* Bill Breakdown */}
              <div className="space-y-1.5 text-xs pt-1 border-t border-surface-border">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span className="font-mono text-text-primary font-bold">{formatPaise(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount Savings</span>
                    <span className="font-mono">-{formatPaise(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-text-muted">
                  <span>Express Delivery</span>
                  <span className="font-mono text-text-primary font-bold">
                    {delivery === 0 ? <span className="text-primary font-bold">FREE</span> : formatPaise(delivery)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-surface-border text-text-primary">
                  <span>Grand Total</span>
                  <span className="font-headline font-black text-base text-primary">
                    {formatPaise(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Proceed Button */}
              <Link
                href="/checkout"
                onClick={() => setIsCartDrawerOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-surface-base py-3.5 px-4 rounded-full font-headline font-extrabold text-sm shadow-gold-glow transition-all active:scale-95"
              >
                <span>Proceed to WhatsApp Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted text-center pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant reservation hold • UPI & COD Available</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
