'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { OrderSnapshot } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { generateWhatsAppOrderUrl } from '@/lib/whatsapp';
import {
  CheckCircle,
  Zap,
  MapPin,
  MessageCircle,
  Truck,
  ArrowRight,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function OrderSuccessPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders?id=${orderId}`);
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
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
        <p className="text-xs text-text-muted">We could not locate this order snapshot. Please check your order history in your account or reconnect via WhatsApp.</p>
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
  const total = order.totalPaise;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Celebration Header */}
      <div className="p-8 rounded-3xl bg-surface-card border border-surface-border text-center space-y-4 shadow-2xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mx-auto shadow-gold-glow">
          <CheckCircle className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-black uppercase text-primary tracking-widest">
            Order Booked Successfully
          </span>
          <h1 className="font-headline font-black text-2xl sm:text-4xl text-text-primary">
            Order #{orderNo}
          </h1>
          <p className="text-xs text-text-muted max-w-md mx-auto pt-1 leading-relaxed">
            Your fits are locked and your WhatsApp confirmation has been initiated with the Indiranagar dark store dispatch desk!
          </p>
        </div>

        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-4 py-1.5 rounded-full text-xs font-bold text-primary">
          <Truck className="w-4 h-4" />
          <span>📦 Estimated Delivery: 2-4 Business Days</span>
        </div>
      </div>

      {/* Live Order Status Pipeline */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-6 shadow-xl">
        <h2 className="font-headline font-bold text-base text-text-primary">Live Fulfillment Status</h2>

        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-surface-border z-0" />
          <div className="absolute left-0 w-2/3 top-1/2 -translate-y-1/2 h-1 bg-primary z-0 shadow-gold-glow" />

          {/* Steps */}
          {[
            { label: 'Placed', done: true },
            { label: 'Verified', done: true },
            { label: 'Packed', done: true },
            { label: 'Out for Delivery', done: false },
            { label: 'Delivered', done: false },
          ].map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  step.done
                    ? 'bg-primary text-surface-base shadow-gold-glow'
                    : 'bg-surface-raised border border-surface-border text-text-muted'
                }`}
              >
                {step.done ? '✓' : idx + 1}
              </div>
              <span className={`text-[10px] font-bold ${step.done ? 'text-primary' : 'text-text-muted'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {order && (
          <a
            href={generateWhatsAppOrderUrl(order)}
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
