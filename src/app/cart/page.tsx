'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/store-context';
import { formatPaise } from '@/lib/money';
import { env } from '@/config/env';
import { Trash2, Plus, Minus, Zap, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function CartPage() {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    appliedCoupon,
    removeCoupon,
    reservationTimeRemainingSeconds,
    getCartSubtotalPaise,
    getDiscountPaise,
    getDeliveryFeePaise,
    getGrandTotalPaise,
  } = useStore();

  const minutes = Math.floor(reservationTimeRemainingSeconds / 60);
  const seconds = reservationTimeRemainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const subtotal = getCartSubtotalPaise();
  const discount = getDiscountPaise();
  const delivery = getDeliveryFeePaise();
  const grandTotal = getGrandTotalPaise();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="border-b border-surface-border pb-4">
        <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">Your Shopping Bag</h1>
        <p className="text-xs text-text-muted mt-0.5">
          {cart.reduce((s, i) => s + i.quantity, 0)} items in your shopping bag
        </p>
      </div>

      {cart.length === 0 ? (
        <div className="py-20 text-center bg-surface-card rounded-2xl border border-surface-border max-w-md mx-auto space-y-4 p-8">
          <p className="font-headline font-bold text-lg text-text-primary">Your bag is currently empty</p>
          <p className="text-xs text-text-muted">Explore our curated drops and party fits to fill your bag.</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-surface-base px-6 py-3 rounded-full font-headline font-bold text-xs shadow-gold-glow transition-all"
          >
            <span>Start Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Cart Items (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Hold Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-surface-card to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Zap className="w-4 h-4 fill-current animate-pulse" />
                <span>Inventory Hold Active: Stock reserved for checkout</span>
              </div>
              <span className="font-mono font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30">
                {timeFormatted} min
              </span>
            </div>

            {/* Item Rows */}
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-4 p-4 rounded-2xl bg-surface-card border border-surface-border items-center"
                >
                  <div className="relative w-20 h-28 rounded-xl overflow-hidden bg-surface-raised flex-shrink-0">
                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-extrabold uppercase text-text-muted">{item.brand}</p>
                    <h3 className="font-headline font-bold text-sm text-text-primary">{item.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="font-bold text-text-surface bg-surface-raised px-2 py-0.5 rounded border border-surface-border">
                        Size: {item.size}
                      </span>
                      <span>{item.color}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 bg-surface-raised rounded-full px-3 py-1 border border-surface-border">
                        <button
                          onClick={() => updateQuantity(item.variantId, -1)}
                          className="text-text-muted hover:text-text-primary transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-mono font-bold px-2 text-text-primary">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.variantId, 1)}
                          className="text-text-muted hover:text-text-primary transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-headline font-black text-base text-text-primary">
                          {formatPaise(item.sellingPricePaise * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.variantId)}
                          className="text-text-muted hover:text-red-400 p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Order Summary (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
              <h3 className="font-headline font-bold text-lg text-text-primary">Order Summary</h3>

              {appliedCoupon && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{appliedCoupon.code} (-{formatPaise(discount)})</span>
                  </div>
                  <button onClick={removeCoupon} className="text-xs text-text-muted hover:text-text-primary underline">
                    Remove
                  </button>
                </div>
              )}

              <div className="space-y-2 text-xs border-t border-surface-border pt-3">
                <div className="flex justify-between text-text-muted">
                  <span>Bag Subtotal</span>
                  <span className="font-mono text-text-primary">{formatPaise(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Coupon Savings</span>
                    <span className="font-mono">-{formatPaise(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-text-muted">
                  <span>Express Delivery</span>
                  <span className="font-mono text-text-primary">
                    {delivery === 0 ? <span className="text-primary font-bold">FREE</span> : formatPaise(delivery)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-text-primary pt-3 border-t border-surface-border">
                  <span>Total Amount</span>
                  <span className="font-headline font-black text-xl text-primary">{formatPaise(grandTotal)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-surface-base py-3.5 px-4 rounded-full font-headline font-black text-sm shadow-[0_4px_24px_rgba(250,204,21,0.35)] transition-all active:scale-95"
              >
                <span>Proceed to WhatsApp Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted text-center pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Express Delivery • Doorstep Try &amp; Buy Supported</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
