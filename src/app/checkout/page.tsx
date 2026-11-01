'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { useStore } from '@/lib/store-context';
import { formatPaise } from '@/lib/money';
import { OrderSnapshot, ShippingAddress } from '@/lib/types';
import { getCurrentUserAction } from '@/modules/auth/actions';
import { UserProfile } from '@/modules/auth/types';
import {
  MapPin,
  ShieldCheck,
  CheckCircle,
  Truck,
  ArrowRight,
  User,
  LogIn,
  CreditCard,
  Lock,
  AlertCircle,
  X,
  Zap,
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
  const [paymentPreference, setPaymentPreference] = useState<'razorpay' | 'cod'>('razorpay');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pincode serviceability state
  const [pincodeServiceability, setPincodeServiceability] = useState<{
    loading: boolean;
    checked: boolean;
    serviceable: boolean;
    estimatedDays?: number;
    codAvailable?: boolean;
    error?: string;
  }>({ loading: false, checked: false, serviceable: true });

  // COD OTP Modal state
  const [isCodModalOpen, setIsCodModalOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderNo, setActiveOrderNo] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Order submission error
  const [orderError, setOrderError] = useState<string | null>(null);

  // Load User profile
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

  // Cooldown countdown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Pincode lookup with debounce
  useEffect(() => {
    const rawPincode = address.pincode.trim();
    if (rawPincode.length !== 6 || !/^\d{6}$/.test(rawPincode)) {
      setPincodeServiceability({ loading: false, checked: false, serviceable: true });
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setPincodeServiceability((prev) => ({ ...prev, loading: true, error: undefined }));
      try {
        const res = await fetch(`/api/shipping/serviceability?pincode=${rawPincode}&cod=${paymentPreference === 'cod' ? '1' : '0'}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setPincodeServiceability({
            loading: false,
            checked: true,
            serviceable: false,
            error: data.error || 'Pincode not serviceable.',
          });
          return;
        }

        setPincodeServiceability({
          loading: false,
          checked: true,
          serviceable: data.serviceable,
          estimatedDays: data.estimatedDays || 3,
          codAvailable: data.codAvailable ?? true,
          error: data.serviceable ? undefined : 'This pincode is currently outside courier service area.',
        });
      } catch (err) {
        if (!isMounted) return;
        setPincodeServiceability({
          loading: false,
          checked: true,
          serviceable: true,
          estimatedDays: 3,
        });
      }
    }, 600);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [address.pincode, paymentPreference]);

  const subtotal = getCartSubtotalPaise();
  const discount = getDiscountPaise();
  const delivery = getDeliveryFeePaise();
  const grandTotal = getGrandTotalPaise();

  // Dynamically load Razorpay SDK
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Submit Order Handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setOrderError(null);

    const customerName = address.fullName.trim() || currentUser?.name || 'Customer';
    const customerPhone = address.phone.trim().replace(/\D/g, '').slice(-10);

    if (!customerName || !customerPhone || !address.street.trim() || !address.city.trim() || !address.pincode.trim()) {
      setOrderError('Please fill in all mandatory delivery address fields (*).');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(customerPhone)) {
      setOrderError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload: any = {
        orderNo: `MUV-${Math.floor(1000 + Math.random() * 9000)}`,
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
        items: cart.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || (i as any)._id?.toString() || `${i.productId}_${i.size}_${i.sku || 'std'}`,
          sku: i.sku || 'SKU-STD',
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
      };

      const idempotencyKey = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.order) {
        throw new Error(data.error || 'Failed to place order. Please try again.');
      }

      const createdOrder: OrderSnapshot = data.order;

      // ─── 1. Online Payment via Razorpay ──────────────────────────────────────
      if (paymentPreference === 'razorpay') {
        const sdkLoaded = await loadRazorpayScript();
        if (!sdkLoaded) {
          throw new Error('Unable to load payment gateway SDK. Please check your internet connection.');
        }

        const rzpRes = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: grandTotal,
            currency: 'INR',
            receipt: createdOrder.orderNo,
            orderId: createdOrder.id,
          }),
        });

        const rzpData = await rzpRes.json();
        if (!rzpRes.ok) {
          throw new Error(rzpData.error || 'Failed to initialize payment gateway.');
        }

        const options = {
          key: rzpData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: rzpData.amount,
          currency: rzpData.currency || 'INR',
          name: 'MUVERA',
          description: `Order #${createdOrder.orderNo}`,
          order_id: rzpData.order_id,
          prefill: {
            name: customerName,
            email: currentUser?.email || '',
            contact: customerPhone,
          },
          theme: { color: '#FACC15' },
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: createdOrder.id,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error || 'Payment signature verification failed.');
              }

              clearCart();
              router.push(`/order-success/${createdOrder.id}?payment_id=${response.razorpay_payment_id}`);
            } catch (verifyErr: any) {
              console.error('Payment verification error:', verifyErr);
              setIsSubmitting(false);
              setOrderError(verifyErr.message || 'Payment verification failed. Please contact support.');
            }
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
              setOrderError('Payment was cancelled. You can retry payment whenever you are ready.');
            },
          },
        };

        const rzpInstance = new (window as any).Razorpay(options);
        rzpInstance.on('payment.failed', function (failureResponse: any) {
          setIsSubmitting(false);
          const failureReason = failureResponse?.error?.description || 'Payment was declined or failed.';
          setOrderError(`Payment failed: ${failureReason}. Please retry or choose another payment method.`);
        });
        rzpInstance.open();
        return;
      }

      // ─── 2. Cash on Delivery (COD) ──────────────────────────────────────────
      if (currentUser?.email) {
        // Trigger COD OTP verification
        setActiveOrderId(createdOrder.id);
        setActiveOrderNo(createdOrder.orderNo);
        setIsCodModalOpen(true);
        setIsSubmitting(false);
        await handleSendCodOtp(createdOrder.id);
        return;
      }

      // Guest COD direct completion
      clearCart();
      router.push(`/order-success/${createdOrder.id}`);
    } catch (err: any) {
      console.error('Order checkout error:', err);
      setOrderError(err.message || 'Failed to submit order. Please check your network and try again.');
      setIsSubmitting(false);
    }
  };

  // COD OTP Send Handler
  const handleSendCodOtp = async (orderId: string) => {
    setIsSendingOtp(true);
    setOtpError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cod-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }
      setOtpCooldown(data.cooldownSeconds || 60);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // COD OTP Verification Handler
  const handleVerifyCodOtp = async () => {
    if (!activeOrderId || !otpCode.trim()) {
      setOtpError('Please enter the 6-digit code.');
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch(`/api/orders/${activeOrderId}/cod-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired code.');
      }

      setIsCodModalOpen(false);
      clearCart();
      router.push(`/order-success/${activeOrderId}`);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        <h2 className="font-headline font-bold text-xl text-text-primary">Your bag is empty</h2>
        <p className="text-xs text-text-muted">Add some drops to your bag before checking out.</p>
        <Button onClick={() => router.push('/products')} size="sm">
          Browse Drops
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div>
        <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">
          Secure Express Checkout
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Direct courier fulfillment • Instant dispatch • Real-time tracking
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
                Have an account? Log in for 1-click checkout &amp; order tracking
              </h3>
              <p className="text-xs text-text-muted mt-0.5 max-w-xl">
                Log in to link this order to your profile for live delivery updates &amp; GST tax invoices.
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
                <label className="font-bold text-text-muted mb-1 block">10-Digit Mobile Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g. 9876543210"
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
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })}
                  placeholder="6-digit pincode"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-mono font-bold"
                />

                {/* Live Pincode Serviceability Indicator */}
                {pincodeServiceability.checked && (
                  <div className="mt-2 text-xs">
                    {pincodeServiceability.serviceable ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Serviceable by Express Couriers • Estimated Delivery: {pincodeServiceability.estimatedDays || 3} days
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {pincodeServiceability.error || 'Pincode not serviceable for courier dispatch.'}
                      </span>
                    )}
                  </div>
                )}
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
                    Express Air &amp; Surface Dispatch
                  </p>
                  <p className="text-[11px] text-text-muted">Direct dispatch from Indiranagar dark store Hub • 2-4 Business Days</p>
                </div>
              </div>
              <span className="text-xs font-bold text-primary font-mono">
                {delivery === 0 ? 'FREE' : formatPaise(delivery)}
              </span>
            </div>
          </div>

          {/* Step 3: Payment Modes (Razorpay Standard & COD) */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="font-headline font-bold text-base text-text-primary">3. Payment Method</h2>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Razorpay Online */}
                <button
                  type="button"
                  onClick={() => setPaymentPreference('razorpay')}
                  className={`p-4 rounded-xl border font-bold text-xs flex items-start gap-3 transition-all text-left ${
                    paymentPreference === 'razorpay'
                      ? 'border-primary bg-primary/15 text-primary shadow-gold-glow'
                      : 'border-surface-border bg-surface-raised text-text-muted hover:bg-surface-bright'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full border border-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    {paymentPreference === 'razorpay' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-primary fill-current" />
                      <span>Online Payment</span>
                    </p>
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                      UPI (GPay, PhonePe, Paytm), Credit / Debit Cards, &amp; NetBanking via Razorpay.
                    </p>
                  </div>
                </button>

                {/* Option 2: Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentPreference('cod')}
                  className={`p-4 rounded-xl border font-bold text-xs flex items-start gap-3 transition-all text-left ${
                    paymentPreference === 'cod'
                      ? 'border-primary bg-primary/15 text-primary shadow-gold-glow'
                      : 'border-surface-border bg-surface-raised text-text-muted hover:bg-surface-bright'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full border border-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    {paymentPreference === 'cod' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-sm">
                      💵 Cash on Delivery
                    </p>
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                      Pay cash or UPI directly to the courier upon doorstep parcel delivery.
                    </p>
                  </div>
                </button>
              </div>

              {paymentPreference === 'razorpay' && (
                <div className="p-3.5 rounded-xl bg-surface-raised border border-surface-border text-xs text-text-muted space-y-1">
                  <p className="font-bold text-text-primary flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Instant &amp; 100% Encrypted Gateway</span>
                  </p>
                  <p>All major UPI apps, RuPay, Visa, Mastercard, and NetBanking are accepted securely.</p>
                </div>
              )}

              {paymentPreference === 'cod' && (
                <div className="p-3.5 rounded-xl bg-surface-raised border border-surface-border text-xs text-text-muted space-y-1">
                  <p className="font-bold text-text-primary">How Cash on Delivery works:</p>
                  <p>1. Confirm your order to allocate inventory stock for express dispatch.</p>
                  <p>2. Keep exact cash or your UPI app ready when the courier arrives at your door.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary (5 cols) */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-6 shadow-xl sticky top-24">
            <h3 className="font-headline font-bold text-base text-text-primary pb-2 border-b border-surface-border">
              Order Review
            </h3>

            {/* Item Thumbnails */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <div className="w-12 h-14 relative bg-surface-raised rounded-lg overflow-hidden flex-shrink-0 border border-surface-border">
                    <Image
                      src={item.image || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&auto=format&fit=crop&q=80'}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-primary truncate">{item.title}</p>
                    <p className="text-[11px] text-text-muted">
                      Size: <span className="font-bold text-text-primary">{item.size}</span> • Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right font-mono font-bold text-text-primary">
                    {formatPaise(item.sellingPricePaise * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-2 text-xs pt-3 border-t border-surface-border">
              <div className="flex justify-between text-text-muted">
                <span>Items Subtotal</span>
                <span className="font-mono text-text-primary">{formatPaise(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon Savings ({appliedCoupon?.code})</span>
                  <span className="font-mono">-{formatPaise(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-text-muted">
                <span>Delivery Charge</span>
                <span className="font-mono text-emerald-400">
                  {delivery === 0 ? 'FREE' : formatPaise(delivery)}
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
              disabled={isSubmitting || (pincodeServiceability.checked && !pincodeServiceability.serviceable)}
              className="py-4 text-sm font-headline font-black shadow-gold-glow flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5 fill-current" />
              <span>
                {isSubmitting
                  ? 'Processing...'
                  : paymentPreference === 'razorpay'
                  ? 'Proceed to Pay with Razorpay'
                  : 'Confirm Order via Cash on Delivery'}
              </span>
            </Button>

            <div className="space-y-2 text-center text-[11px] text-text-muted pt-2 border-t border-surface-border">
              <p className="flex items-center justify-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>
                  {currentUser
                    ? `Linked to account (${currentUser.email || currentUser.name})`
                    : '100% Authentic Streetwear Guarantee'}
                </span>
              </p>
              <p>Statutory GST Tax Invoice &amp; live courier tracking dispatched upon packing.</p>
            </div>
          </div>
        </div>
      </form>

      {/* COD Email OTP Modal */}
      {isCodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsCodModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-headline font-bold text-lg text-text-primary">
                Verify Cash on Delivery
              </h3>
              <p className="text-xs text-text-muted">
                A 6-digit confirmation code was sent to <strong className="text-text-primary">{currentUser?.email}</strong> to verify your delivery address.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-center text-xl font-mono font-bold tracking-widest text-text-primary focus:outline-none focus:border-primary"
              />

              {otpError && (
                <p className="text-xs text-red-400 font-bold text-center">{otpError}</p>
              )}

              <Button
                onClick={handleVerifyCodOtp}
                fullWidth
                disabled={isVerifyingOtp || otpCode.length !== 6}
                className="py-3 font-headline font-bold"
              >
                {isVerifyingOtp ? 'Verifying...' : 'Confirm Delivery'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => activeOrderId && handleSendCodOtp(activeOrderId)}
                  disabled={otpCooldown > 0 || isSendingOtp}
                  className="text-xs text-text-muted hover:text-primary transition-colors font-semibold disabled:opacity-50"
                >
                  {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
