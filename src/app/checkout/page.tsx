'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useStore } from '@/lib/store-context';
import { formatPaise } from '@/lib/money';
import { generateWhatsAppOrderUrl, generateInstantWhatsAppCartUrl } from '@/lib/whatsapp';
import { generateUpiQrDataUrl, generateUpiPaymentUrl } from '@/lib/upi';
import { OrderSnapshot, ShippingAddress } from '@/lib/types';
import { getCurrentUserAction } from '@/modules/auth/actions';
import { UserProfile } from '@/modules/auth/types';
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
  Copy,
  Check,
  User,
  LogIn,
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
    siteSettings,
  } = useStore();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [address, setAddress] = useState<ShippingAddress>({
    fullName: '',
    phone: '',
    street: '',
    apartment: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [deliveryMethod, setDeliveryMethod] = useState<'express_60' | 'standard'>('standard');
  const [paymentPreference, setPaymentPreference] = useState<'upi_whatsapp' | 'cod_whatsapp'>('upi_whatsapp');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Live Payment & WhatsApp variables strictly from CMS siteSettings (MongoDB)
  const businessUpiId = siteSettings?.businessUpiId || '';
  const businessUpiMerchantName = siteSettings?.businessUpiMerchantName || siteSettings?.businessName || '';
  const businessWhatsAppNumber = (siteSettings?.whatsappNumber || '').replace(/\D/g, '');
  const codEnabled = siteSettings?.codEnabled ?? false;
  const upiEnabled = siteSettings?.upiEnabled ?? true;
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Ensure selected payment preference complies with dynamic settings
  useEffect(() => {
    if (siteSettings) {
      if (!siteSettings.codEnabled && paymentPreference === 'cod_whatsapp') {
        setPaymentPreference('upi_whatsapp');
      } else if (!siteSettings.upiEnabled && siteSettings.codEnabled && paymentPreference === 'upi_whatsapp') {
        setPaymentPreference('cod_whatsapp');
      }
    }
  }, [siteSettings, paymentPreference]);

  // Stable Temporary Order Number (Does not re-roll on form input keystrokes)
  const [tempOrderNo] = useState<string>(() => `MUV-${Math.floor(1000 + Math.random() * 9000)}`);

  // In-memory base64 Data URL for scannable QR Code
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState<boolean>(true);

  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUserAction().catch(() => null);
        if (user) {
          setCurrentUser(user);
          const defaultAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
          setAddress({
            fullName: defaultAddr?.fullName || user.name || '',
            phone: defaultAddr?.phone || user.phone || '',
            street: defaultAddr?.street || '',
            apartment: defaultAddr?.apartment || '',
            landmark: defaultAddr?.landmark || '',
            city: defaultAddr?.city || '',
            state: defaultAddr?.state || '',
            pincode: defaultAddr?.pincode || '',
          });
        }
      } catch (err) {
        console.error('Failed to load user address in checkout:', err);
      }
    }
    loadUser();
  }, []);

  const handleCopyUpi = () => {
    if (typeof navigator !== 'undefined' && businessUpiId) {
      navigator.clipboard.writeText(businessUpiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const subtotal = getCartSubtotalPaise();
  const discount = getDiscountPaise();
  const delivery = getDeliveryFeePaise();
  const grandTotal = getGrandTotalPaise();
  const amountRupees = grandTotal / 100;

  // Generate in-memory QR code without external network calls
  useEffect(() => {
    let isMounted = true;
    setQrLoading(true);

    generateUpiQrDataUrl({
      amountRupees,
      orderNo: tempOrderNo,
      upiId: businessUpiId,
      payeeName: businessUpiMerchantName,
    })
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setQrLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate UPI QR code:', err);
        if (isMounted) setQrLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [amountRupees, tempOrderNo, businessUpiId, businessUpiMerchantName]);

  const upiIntentUrl = generateUpiPaymentUrl(amountRupees, tempOrderNo, businessUpiId, businessUpiMerchantName);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setOrderError(null);

    const customerName = address.fullName.trim() || currentUser?.name || 'Customer';
    const customerPhone = address.phone.trim() || currentUser?.phone || '';

    if (!customerName || !customerPhone || !address.street.trim() || !address.city.trim() || !address.pincode.trim()) {
      setOrderError('Please fill in all mandatory delivery address fields (*).');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload: Partial<OrderSnapshot> = {
        orderNo: tempOrderNo,
        customerName,
        customerPhone,
        customerEmail: currentUser?.email || undefined,
        shippingAddress: {
          fullName: customerName,
          phone: customerPhone,
          street: address.street.trim(),
          apartment: address.apartment?.trim() || undefined,
          landmark: address.landmark?.trim() || undefined,
          city: address.city.trim(),
          state: address.state?.trim() || 'Karnataka',
          pincode: address.pincode.trim(),
        },
        deliveryMethod,
        paymentPreference,
        paymentStatus: 'pending_whatsapp',
        fulfilmentStatus: 'unfulfilled',
        orderStatus: 'open',
        items: cart.map((i) => {
          const vId = i.variantId || (i as any)._id?.toString() || `${i.productId}_${i.size}_${i.sku || 'std'}`;
          return {
            productId: i.productId,
            variantId: vId,
            sku: i.sku || 'SKU-STD',
            productName: i.title,
            brand: i.brand,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            sellingPricePaise: i.sellingPricePaise,
            mrpPaise: i.mrpPaise,
            image: i.image,
          };
        }),
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
      if (!res.ok || !data.order) {
        throw new Error(data.error || 'Failed to persist order in store records. Please try again.');
      }

      const savedOrder: OrderSnapshot = data.order;

      // Build WhatsApp deep link URL with dynamic live settings
      const whatsappUrl = generateWhatsAppOrderUrl(savedOrder, businessWhatsAppNumber, businessUpiMerchantName);

      // Open WhatsApp in a new window/tab
      if (typeof window !== 'undefined') {
        window.open(whatsappUrl, '_blank');
      }

      // Clear the local cart
      clearCart();

      // Navigate to order confirmation
      router.push(`/order-success/${savedOrder.id}`);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setOrderError(err.message || 'Failed to submit order. Please check your network and try again.');
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

      {/* Auth Prompt for Guests */}
      {!currentUser && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-primary flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-sm sm:text-base text-text-primary">
                Have an account? Log in to save orders to your profile
              </h3>
              <p className="text-xs text-text-muted mt-0.5 max-w-xl">
                Log in to link this order to your account for live parcel tracking &amp; GST tax invoices. If you prefer not to log in, <span className="text-emerald-400 font-bold">Instant WhatsApp Order</span> will be chosen.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <Link
              href="/login?redirect=/checkout"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-surface-base text-xs font-headline font-bold transition-all shadow-gold-glow"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </Link>
            <a
              href={generateInstantWhatsAppCartUrl({
                items: cart,
                subtotalPaise: subtotal,
                discountPaise: discount,
                deliveryFeePaise: delivery,
                totalPaise: grandTotal,
                couponCode: appliedCoupon?.code,
                customPhone: businessWhatsAppNumber,
                customBusinessName: businessUpiMerchantName,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-headline font-bold transition-all shadow-[0_4px_16px_rgba(16,185,129,0.2)]"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Instant WhatsApp Order</span>
            </a>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Shipping Address Form */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="font-headline font-bold text-base text-text-primary">1. Delivery Address</h2>
              </div>
              {currentUser && (
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                  Logged in as {currentUser.name}
                </span>
              )}
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
                <label className="font-bold text-text-muted mb-1 block">City *</label>
                <input
                  type="text"
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="e.g. Bengaluru"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">State *</label>
                <input
                  type="text"
                  required
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  placeholder="e.g. Karnataka"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-text-muted mb-1 block">Pincode *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  placeholder="6-digit pincode"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-mono font-bold"
                />
              </div>
            </div>

            {orderError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold animate-in fade-in duration-200">
                {orderError}
              </div>
            )}
          </div>

          {/* Step 2: Delivery Speed */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-3 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
              <Truck className="w-5 h-5 text-primary" />
              <h2 className="font-headline font-bold text-base text-text-primary">2. Delivery Speed</h2>
            </div>

            <div className="p-3.5 rounded-xl border border-primary bg-primary/10 text-text-primary shadow-gold-glow flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border border-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-bold text-xs text-text-primary flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    Express Courier Delivery
                  </p>
                  <p className="text-[11px] text-text-muted">Fast Doorstep Dispatch Across India • 2-4 Business Days</p>
                </div>
              </div>
              <span className="text-xs font-bold text-primary font-mono">
                {delivery === 0 ? 'FREE' : formatPaise(delivery)}
              </span>
            </div>
          </div>

          {/* Step 3: Payment & WhatsApp Gateway */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
              <QrCode className="w-5 h-5 text-primary" />
              <h2 className="font-headline font-bold text-base text-text-primary">3. Payment &amp; Confirmation Mode</h2>
            </div>

            {/* Mode Tabs */}
            <div className={`grid ${upiEnabled && codEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              {upiEnabled && (
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
              )}

              {codEnabled && (
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
              )}
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

                <div className="inline-block p-3 rounded-2xl bg-white shadow-2xl border-4 border-amber-400">
                  {qrLoading || !qrDataUrl ? (
                    <div className="w-[min(70vw,14rem)] h-[min(70vw,14rem)] flex flex-col items-center justify-center bg-zinc-100 rounded-lg animate-pulse text-zinc-500">
                      <QrCode className="w-10 h-10 stroke-[1.5] mb-2 animate-spin text-amber-500" />
                      <span className="text-[11px] font-bold">Generating UPI QR...</span>
                    </div>
                  ) : (
                    <img
                      src={qrDataUrl}
                      alt="UPI Payment QR Code"
                      className="w-[min(70vw,14rem)] h-[min(70vw,14rem)] object-contain rounded-lg block mx-auto"
                    />
                  )}
                </div>

                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-surface-card px-3.5 py-1.5 rounded-full border border-surface-border">
                    <span className="text-xs font-mono font-bold text-amber-500 dark:text-primary select-all">
                      {businessUpiId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1 hover:text-primary transition-colors text-slate-700 dark:text-zinc-300 text-[11px] flex items-center gap-1 font-sans font-bold"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <a
                    href={upiIntentUrl}
                    className="inline-flex sm:hidden items-center gap-2 text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 px-4 py-2 rounded-full font-headline font-black shadow-md transition-all active:scale-95"
                  >
                    <Zap className="w-4 h-4 fill-current text-slate-950" />
                    <span>Pay via UPI App (GPay / PhonePe / Paytm)</span>
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
              <span>
                {isSubmitting
                  ? 'Booking Order...'
                  : currentUser
                  ? 'Confirm & Place Order'
                  : '⚡ Instant WhatsApp Order (Guest)'}
              </span>
            </Button>

            <div className="space-y-2 text-center text-[11px] text-text-muted pt-2 border-t border-surface-border">
              <p className="flex items-center justify-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>
                  {currentUser
                    ? `Linked to account (${currentUser.email || currentUser.name})`
                    : 'Instant WhatsApp Order • No login required'}
                </span>
              </p>
              <p>Your order will be verified on WhatsApp by the dark store dispatch team.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
