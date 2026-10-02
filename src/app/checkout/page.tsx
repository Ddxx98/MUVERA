'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStore } from '@/lib/store-context';
import { formatPaise } from '@/lib/money';
import { generateWhatsAppOrderUrl } from '@/lib/whatsapp';
import { generateUpiQrCodeUrl, generateUpiPaymentUrl } from '@/lib/upi';
import { env } from '@/config/env';
import { OrderSnapshot, ShippingAddress } from '@/lib/types';
import {
  MapPin,
  Zap,
  QrCode,
  MessageCircle,
  ShieldCheck,
  CheckCircle,
  Truck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function CheckoutPage() {
  const router = useRouter();
  const {
    cart,
    clearCart,
    appliedCoupon,
    getCartSubtotalPaise,
    getDiscountPaise,
    getDeliveryFeePaise,
    getGrandTotalPaise,
  } = useStore();

  const [address, setAddress] = useState<ShippingAddress>({
    fullName: 'Deekshith D V',
    phone: '9380933170',
    street: '12th Main Road, HAL 2nd Stage, Indiranagar',
    apartment: 'Apt 4B, Silver Palms',
    landmark: 'Near Corner House',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
  });

  const [deliveryMethod, setDeliveryMethod] = useState<'express_60' | 'standard'>('express_60');
  const [paymentPreference, setPaymentPreference] = useState<'upi_whatsapp' | 'cod_whatsapp'>('upi_whatsapp');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = getCartSubtotalPaise();
  const discount = getDiscountPaise();
  const delivery = getDeliveryFeePaise();
  const grandTotal = getGrandTotalPaise();
  const amountRupees = grandTotal / 100;

  // Generate a random temporary order number
  const tempOrderNo = `MUV-${Math.floor(1000 + Math.random() * 9000)}`;
  const qrUrl = generateUpiQrCodeUrl(amountRupees, tempOrderNo);
  const upiIntentUrl = generateUpiPaymentUrl(amountRupees, tempOrderNo);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);

    try {
      const orderPayload: Partial<OrderSnapshot> = {
        orderNo: tempOrderNo,
        customerName: address.fullName,
        customerPhone: address.phone,
        shippingAddress: address,
        deliveryMethod,
        paymentPreference,
        paymentStatus: 'pending_whatsapp',
        fulfilmentStatus: 'unfulfilled',
        orderStatus: 'open',
        items: cart.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          sku: i.sku,
          productName: i.title,
          brand: i.brand,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          sellingPricePaise: i.sellingPricePaise,
          mrpPaise: i.mrpPaise,
          image: i.image,
        })),
        subtotalPaise: subtotal,
        discountPaise: discount,
        deliveryFeePaise: delivery,
        totalPaise: grandTotal,
        couponCode: appliedCoupon?.code,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Call API to persist order and reserve stock
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      const savedOrder: OrderSnapshot = data.order || { ...orderPayload, id: `ord_${Date.now()}` };

      // Build WhatsApp deep link URL
      const whatsappUrl = generateWhatsAppOrderUrl(savedOrder);

      // Open WhatsApp in a new window/tab
      if (typeof window !== 'undefined') {
        window.open(whatsappUrl, '_blank');
      }

      // Clear the local cart
      clearCart();

      // Navigate to order confirmation
      router.push(`/order-success/${savedOrder.id}`);
    } catch (err) {
      console.error('Order creation error:', err);
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-headline font-bold text-xl text-text-primary">Your bag is empty</h2>
        <p className="text-xs text-text-muted">Add some drops to your bag before checking out.</p>
        <Button onClick={() => router.push('/products')} size="sm">
          Browse Drops
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">
          WhatsApp Fast Checkout &amp; Payment
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Instant order booking • Inventory held • Direct WhatsApp confirmation
        </p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Shipping Address Form */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-headline font-bold text-base text-text-primary">1. Delivery Address</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-text-muted mb-1 block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">WhatsApp Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder="10-digit phone number"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-text-muted mb-1 block">Street Address *</label>
                <input
                  type="text"
                  required
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  placeholder="House/Flat No, Building, Street"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Apartment / Suite (Optional)</label>
                <input
                  type="text"
                  value={address.apartment || ''}
                  onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Landmark (Optional)</label>
                <input
                  type="text"
                  value={address.landmark || ''}
                  onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">City</label>
                <input
                  type="text"
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Pincode *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Delivery Speed */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-3 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
              <Truck className="w-5 h-5 text-primary" />
              <h2 className="font-headline font-bold text-base text-text-primary">2. Delivery Speed</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setDeliveryMethod('express_60')}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  deliveryMethod === 'express_60'
                    ? 'border-primary bg-primary/10 text-text-primary shadow-gold-glow'
                    : 'border-surface-border bg-surface-raised text-text-muted hover:border-text-muted'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border border-primary flex items-center justify-center">
                    {deliveryMethod === 'express_60' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-text-primary flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-primary fill-current" />
                      60-Minute Express
                    </p>
                    <p className="text-[11px] text-text-muted">Indiranagar Dark Store Hub</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary">
                  {delivery === 0 ? 'FREE' : formatPaise(delivery)}
                </span>
              </label>

              <label
                onClick={() => setDeliveryMethod('standard')}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  deliveryMethod === 'standard'
                    ? 'border-primary bg-primary/10 text-text-primary shadow-gold-glow'
                    : 'border-surface-border bg-surface-raised text-text-muted hover:border-text-muted'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border border-primary flex items-center justify-center">
                    {deliveryMethod === 'standard' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-text-primary">Standard Courier</p>
                    <p className="text-[11px] text-text-muted">2-3 Business Days</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-text-muted">FREE</span>
              </label>
            </div>
          </div>

          {/* Step 3: Payment & WhatsApp Gateway */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
              <QrCode className="w-5 h-5 text-primary" />
              <h2 className="font-headline font-bold text-base text-text-primary">3. Payment &amp; Confirmation Mode</h2>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentPreference('upi_whatsapp')}
                className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  paymentPreference === 'upi_whatsapp'
                    ? 'border-primary bg-primary text-surface-base shadow-gold-glow'
                    : 'border-surface-border bg-surface-raised text-text-surface hover:bg-surface-bright'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>UPI Scan &amp; WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentPreference('cod_whatsapp')}
                className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  paymentPreference === 'cod_whatsapp'
                    ? 'border-primary bg-primary text-surface-base shadow-gold-glow'
                    : 'border-surface-border bg-surface-raised text-text-surface hover:bg-surface-bright'
                }`}
              >
                <span>💵 Cash on Delivery</span>
              </button>
            </div>

            {/* Dynamic UPI QR Code Display */}
            {paymentPreference === 'upi_whatsapp' && (
              <div className="p-4 rounded-2xl bg-surface-raised border border-surface-border space-y-4 text-center">
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase text-primary tracking-wider">
                    Instant UPI QR Payment
                  </span>
                  <p className="text-xs text-text-muted">
                    Scan with GPay, PhonePe, Paytm, or BHIM to pay <strong className="text-text-primary font-mono font-bold">{formatPaise(grandTotal)}</strong>
                  </p>
                </div>

                <div className="inline-block p-3 rounded-2xl bg-white shadow-2xl border-4 border-primary">
                  <Image
                    src={qrUrl}
                    alt="UPI Payment QR Code"
                    width={200}
                    height={200}
                    className="rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-primary">
                    UPI ID: {env.businessUpiId}
                  </p>
                  <a
                    href={upiIntentUrl}
                    className="inline-block sm:hidden text-xs text-primary underline font-bold"
                  >
                    Tap to Open UPI App directly
                  </a>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-card border border-surface-border text-left text-xs text-text-muted flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p>
                    After scanning and paying, click the gold button below. WhatsApp will open with your order details pre-filled. Simply send the message and paste your payment screenshot!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary & Action (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl sticky top-24">
            <h3 className="font-headline font-bold text-lg text-text-primary">Order Review</h3>

            {/* Item List Summary */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.variantId} className="flex gap-3 items-center text-xs">
                  <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-surface-raised flex-shrink-0">
                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-text-primary line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-text-muted">
                      Size: {item.size} • Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-text-primary">
                    {formatPaise(item.sellingPricePaise * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Totals */}
            <div className="space-y-2 text-xs border-t border-surface-border pt-4">
              <div className="flex justify-between text-text-muted">
                <span>Items Subtotal</span>
                <span className="font-mono text-text-primary">{formatPaise(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Coupon ({appliedCoupon?.code})</span>
                  <span className="font-mono">-{formatPaise(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-text-muted">
                <span>Delivery Charge</span>
                <span className="font-mono text-text-primary">
                  {delivery === 0 ? <span className="text-primary font-bold">FREE</span> : formatPaise(delivery)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-text-primary pt-3 border-t border-surface-border">
                <span>Grand Total</span>
                <span className="font-headline font-black text-xl text-primary">{formatPaise(grandTotal)}</span>
              </div>
            </div>

            {/* Submit Action */}
            <Button
              type="submit"
              size="lg"
              fullWidth
              disabled={isSubmitting}
              className="py-4 text-sm font-headline font-black shadow-gold-glow flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>{isSubmitting ? 'Booking Order...' : 'Confirm Order & Open WhatsApp'}</span>
            </Button>

            <div className="space-y-2 text-center text-[11px] text-text-muted pt-2 border-t border-surface-border">
              <p className="flex items-center justify-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Inventory Held • Zero Risk Cancellation</span>
              </p>
              <p>Your order will be verified on WhatsApp by the dark store dispatch team.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
