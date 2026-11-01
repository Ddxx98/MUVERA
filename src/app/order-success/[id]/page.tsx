'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/store-context';
import { OrderSnapshot } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { generateWhatsAppOrderUrl } from '@/lib/whatsapp';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import {
  CheckCircle,
  Zap,
  MapPin,
  MessageCircle,
  Truck,
  ArrowRight,
  ShieldCheck,
  Package,
  Download,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function OrderSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params?.id as string;
  const paymentIdParam = searchParams.get('payment_id');
  const { siteSettings } = useStore();

  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    let intervalId: any = null;
    let pollCount = 0;
    const maxPolls = 12; // 30 seconds (12 * 2.5s)

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders?id=${orderId}`);
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);

          // If order is prepaid and payment is pending verification, poll
          const isPending =
            data.order.paymentPreference === 'razorpay' &&
            data.order.paymentStatus === 'pending' &&
            pollCount < maxPolls;

          if (isPending) {
            setPolling(true);
            if (!intervalId) {
              intervalId = setInterval(async () => {
                pollCount++;
                try {
                  const pollRes = await fetch(`/api/orders?id=${orderId}`);
                  const pollData = await pollRes.json();
                  if (pollData.order) {
                    setOrder(pollData.order);
                    if (pollData.order.paymentStatus === 'paid' || pollCount >= maxPolls) {
                      clearInterval(intervalId);
                      setPolling(false);
                    }
                  }
                } catch {
                  clearInterval(intervalId);
                  setPolling(false);
                }
              }, 2500);
            }
          } else {
            setPolling(false);
          }
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-text-muted">Loading your order confirmation...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4 bg-surface-card border border-surface-border rounded-3xl p-8 my-12 shadow-2xl">
        <h2 className="font-headline font-bold text-xl text-text-primary">Order Not Found</h2>
        <p className="text-xs text-text-muted">
          We could not locate this order. Please check your order history in your account profile.
        </p>
        <div className="pt-2">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-surface-base px-6 py-3 rounded-full font-headline font-bold text-xs shadow-gold-glow transition-all"
          >
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    );
  }

  const orderNo = order.orderNo;
  const isDirectCommerce = order.paymentPreference === 'cod' || order.paymentPreference === 'razorpay';
  const isCancelled = order.fulfilmentStatus === 'cancelled' || order.orderStatus === 'cancelled';
  const isPaidOrConfirmed =
    order.paymentStatus === 'paid' ||
    order.paymentStatus === 'authorized' ||
    !!order.codConfirmedAt ||
    ['allocated', 'picking', 'packed', 'shipped', 'out_for_delivery', 'delivered'].includes(order.fulfilmentStatus);

  const isPacked = ['packed', 'shipped', 'out_for_delivery', 'delivered'].includes(order.fulfilmentStatus);
  const isShipped = ['shipped', 'out_for_delivery', 'delivered'].includes(order.fulfilmentStatus);
  const isDelivered = order.fulfilmentStatus === 'delivered';

  const steps = [
    { label: 'Booking Request', done: true },
    { label: order.paymentPreference === 'cod' ? 'COD Confirmed' : 'Paid Online', done: isPaidOrConfirmed },
    { label: 'Packed & Invoiced', done: isPacked },
    { label: 'Dispatched', done: isShipped },
    { label: 'Delivered', done: isDelivered },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressWidth =
    completedCount >= 5
      ? 'w-full'
      : completedCount === 4
      ? 'w-3/4'
      : completedCount === 3
      ? 'w-2/4'
      : completedCount === 2
      ? 'w-1/4'
      : 'w-0';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Celebration Header */}
      <div className="p-8 rounded-3xl bg-surface-card border border-surface-border text-center space-y-4 shadow-2xl relative overflow-hidden">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-gold-glow ${
            isCancelled
              ? 'bg-red-500/20 border border-red-500/40 text-red-400'
              : 'bg-primary/20 border border-primary/40 text-primary'
          }`}
        >
          <CheckCircle className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <span
            className={`text-xs font-black uppercase tracking-widest ${
              isCancelled ? 'text-red-400' : 'text-primary'
            }`}
          >
            {isCancelled
              ? 'Order Cancelled'
              : isPaidOrConfirmed
              ? order.paymentPreference === 'cod'
                ? 'Order Confirmed (Cash on Delivery)'
                : 'Payment Verified & Confirmed'
              : 'Order Placed • Awaiting Confirmation'}
          </span>
          <h1 className="font-headline font-black text-2xl sm:text-4xl text-text-primary">
            Order #{orderNo}
          </h1>
          <p className="text-xs text-text-muted max-w-md mx-auto pt-1 leading-relaxed">
            {isCancelled
              ? 'This order has been cancelled and any reserved inventory has been returned to stock.'
              : isPaidOrConfirmed
              ? 'Your order is confirmed and stock has been committed. Fulfillment and dispatch are in progress!'
              : 'Your booking has been received. Please send your payment screenshot or confirm your details on WhatsApp with our Indiranagar dispatch desk to complete order placement.'}
          </p>
        </div>

        {polling && (
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 rounded-full text-xs font-bold text-amber-400 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Confirming payment capture with gateway...</span>
          </div>
        )}

        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-4 py-1.5 rounded-full text-xs font-bold text-primary">
          <Truck className="w-4 h-4" />
          <span>📦 Estimated Delivery: 2-4 Business Days via Express Courier</span>
        </div>

        {order.trackingNumber && (
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 bg-surface-raised border border-surface-border text-[11px] font-mono font-bold text-text-primary px-3 py-1 rounded-full">
              AWB Tracking: {order.trackingNumber}
            </span>
          </div>
        )}
      </div>

      {/* Live Order Status Pipeline */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-base text-text-primary">Live Fulfillment Status</h2>
          <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
            {order.fulfilmentStatus}
          </span>
        </div>

        {isCancelled ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-xs font-bold text-red-400">Order is cancelled. No further fulfillment actions scheduled.</p>
          </div>
        ) : (
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-surface-border z-0" />
            <div
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary z-0 shadow-gold-glow transition-all duration-500 ${progressWidth}`}
            />

            {/* Steps */}
            {steps.map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                    step.done
                      ? 'bg-primary text-surface-base shadow-gold-glow'
                      : 'bg-surface-raised border border-surface-border text-text-muted'
                  }`}
                >
                  {step.done ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-[10px] font-bold text-center max-w-[4.5rem] leading-tight ${
                    step.done ? 'text-primary' : 'text-text-muted'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {order && (
          <button
            type="button"
            onClick={() => generateInvoicePdf(order, siteSettings)}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-headline font-bold text-xs sm:text-sm py-3.5 px-4 rounded-full shadow-lg transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Tax Invoice (PDF)</span>
          </button>
        )}

        {!isDirectCommerce && order && (
          <a
            href={generateWhatsAppOrderUrl(order, siteSettings?.whatsappNumber, siteSettings?.businessUpiMerchantName)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-headline font-bold text-xs sm:text-sm py-3.5 px-4 rounded-full shadow-lg transition-all"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Reconnect on WhatsApp</span>
          </a>
        )}

        <Link
          href={`/account/orders/${order?.id || orderId}`}
          className="flex-1 flex items-center justify-center gap-2 bg-surface-card hover:bg-surface-raised border border-surface-border text-text-primary font-headline font-bold text-xs sm:text-sm py-3.5 px-4 rounded-full transition-all"
        >
          <Package className="w-4 h-4" />
          <span>View Order Timeline</span>
        </Link>
      </div>
    </div>
  );
}
