'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { OrderSnapshot } from '@/lib/types';
import { formatPaise, calculateGstBreakdown } from '@/lib/money';
import { generateWhatsAppOrderUrl } from '@/lib/whatsapp';
import {
  Package,
  MapPin,
  Clock,
  CheckCircle,
  Truck,
  RotateCcw,
  MessageCircle,
  ArrowLeft,
  XCircle,
  ShieldCheck,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('Wrong Size');
  const [refundMethod, setRefundMethod] = useState<'upi_refund' | 'bank_transfer'>('upi_refund');
  const [returnSuccess, setReturnSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/orders?id=${orderId}`);
        const data = await res.json();
        if (data.order) setOrder(data.order);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orderId]);

  if (loading) {
    return <div className="py-24 text-center text-xs text-text-muted">Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h2 className="font-headline font-bold text-text-primary text-lg">Order not found</h2>
        <Button onClick={() => router.push('/account/orders')} size="sm">
          Back to Orders
        </Button>
      </div>
    );
  }

  const gst = calculateGstBreakdown(order.totalPaise);

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReturnSuccess(true);
    setTimeout(() => {
      setIsReturnModalOpen(false);
    }, 2000);
  };

  const handleCancelOrder = async () => {
    setIsCancelModalOpen(false);
    setOrder({
      ...order,
      orderStatus: 'cancelled',
      timeline: [
        ...order.timeline,
        {
          id: `ev_cancel_${Date.now()}`,
          status: 'cancelled',
          description: 'Order cancelled by customer before dispatch.',
          actor: 'Customer',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Top Breadcrumb */}
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Orders</span>
      </Link>

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-surface-card border border-surface-border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline font-black text-2xl text-text-primary">Order #{order.orderNo}</h1>
            <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
              {order.orderStatus === 'cancelled' ? 'Cancelled' : order.fulfilmentStatus}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'full' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {order.orderStatus !== 'cancelled' && order.fulfilmentStatus === 'unfulfilled' && (
            <Button onClick={() => setIsCancelModalOpen(true)} variant="danger" size="sm">
              Cancel Order
            </Button>
          )}

          {order.fulfilmentStatus === 'delivered' && (
            <Button onClick={() => setIsReturnModalOpen(true)} variant="outline" size="sm">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Initiate Return / Exchange</span>
            </Button>
          )}

          <a
            href={generateWhatsAppOrderUrl(order)}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 transition-all shadow-md"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>WhatsApp Chat</span>
          </a>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
        <h2 className="font-headline font-bold text-base text-text-primary">Order Progress Timeline</h2>
        <div className="space-y-4 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-border">
          {order.timeline.map((ev) => (
            <div key={ev.id} className="relative">
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-surface-card shadow-gold-glow" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-text-primary">{ev.description}</p>
                <p className="text-[11px] text-text-muted">
                  By {ev.actor} • {new Date(ev.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Item List & Delivery Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Items (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <h2 className="font-headline font-bold text-base text-text-primary">Itemized Products</h2>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex gap-3 text-xs p-3 rounded-xl bg-surface-raised border border-surface-border">
                <div className="relative w-14 h-16 rounded-lg overflow-hidden bg-surface-base flex-shrink-0">
                  <Image src={item.image} alt={item.productName} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-extrabold uppercase text-text-muted">{item.brand}</p>
                  <p className="font-bold text-text-primary line-clamp-1">{item.productName}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Size: {item.size} • Color: {item.color} • Qty: {item.quantity}
                  </p>
                </div>
                <span className="font-mono font-bold text-text-primary">
                  {formatPaise(item.sellingPricePaise * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="border-t border-surface-border pt-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Items Total</span>
              <span className="font-mono text-text-primary">{formatPaise(order.subtotalPaise)}</span>
            </div>
            {order.discountPaise > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Coupon Savings ({order.couponCode})</span>
                <span className="font-mono">-{formatPaise(order.discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between text-text-muted">
              <span>Express Delivery Fee</span>
              <span className="font-mono text-text-primary">
                {order.deliveryFeePaise === 0 ? 'FREE' : formatPaise(order.deliveryFeePaise)}
              </span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Taxes Included (GST 12%)</span>
              <span className="font-mono text-text-primary">{formatPaise(gst.gstAmountPaise)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-text-primary pt-2 border-t border-surface-border">
              <span>Grand Total</span>
              <span className="font-headline font-black text-base text-primary font-mono">
                {formatPaise(order.totalPaise)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping Address & Payment Snapshot (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-3">
            <div className="flex items-center gap-2 text-primary pb-2 border-b border-surface-border">
              <MapPin className="w-4 h-4" />
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-text-primary">
                Delivery Address
              </h3>
            </div>
            <div className="text-xs text-text-muted space-y-1 leading-relaxed">
              <p className="font-bold text-text-primary">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.phone}</p>
              <p>{order.shippingAddress.street}</p>
              {order.shippingAddress.apartment && <p>{order.shippingAddress.apartment}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-3">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-text-primary pb-2 border-b border-surface-border">
              Payment Method
            </h3>
            <div className="text-xs space-y-1">
              <p className="font-bold text-text-primary uppercase">
                {order.paymentPreference.replace('_', ' ')}
              </p>
              <p className="text-emerald-400 font-semibold">
                Status: {order.paymentStatus.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-headline font-bold text-base text-text-primary">Cancel Order #{order.orderNo}?</h3>
            <p className="text-xs text-text-muted">
              Are you sure you want to cancel this order? Your reserved stock will be returned to the dark store inventory.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setIsCancelModalOpen(false)} variant="outline" size="sm" fullWidth>
                Keep Order
              </Button>
              <Button onClick={handleCancelOrder} variant="danger" size="sm" fullWidth>
                Yes, Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Return / Exchange Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-surface-border">
              <h3 className="font-headline font-bold text-base text-text-primary">Initiate Return / Exchange</h3>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {returnSuccess ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-headline font-bold text-text-primary text-base">Return Request Submitted</h4>
                <p className="text-xs text-text-muted">
                  A rider will be assigned to pick up the items within 24 hours. Your UPI refund will be triggered upon inspection!
                </p>
              </div>
            ) : (
              <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Reason for Return *</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                  >
                    <option value="Wrong Size">Wrong Size / Fit Issue</option>
                    <option value="Defective">Defective / Damaged Item</option>
                    <option value="Not As Pictured">Color / Fabric Not As Pictured</option>
                    <option value="Changed Mind">Changed Mind</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">Refund Resolution *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRefundMethod('upi_refund')}
                      className={`p-2.5 rounded-xl border text-center font-bold ${
                        refundMethod === 'upi_refund'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-surface-border bg-surface-raised text-text-muted'
                      }`}
                    >
                      Instant UPI Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundMethod('bank_transfer')}
                      className={`p-2.5 rounded-xl border text-center font-bold ${
                        refundMethod === 'bank_transfer'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-surface-border bg-surface-raised text-text-muted'
                      }`}
                    >
                      Store Credit (+5% Extra)
                    </button>
                  </div>
                </div>

                <Button type="submit" size="md" fullWidth>
                  Confirm Return Request
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
