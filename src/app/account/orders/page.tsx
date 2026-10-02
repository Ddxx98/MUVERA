'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { OrderSnapshot } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { Package, ArrowRight, Zap, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'delivered'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.orders) setOrders(data.orders);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'in_progress') return o.fulfilmentStatus !== 'delivered' && o.orderStatus !== 'cancelled';
    if (activeTab === 'delivered') return o.fulfilmentStatus === 'delivered';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="border-b border-surface-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">Your Orders</h1>
          <p className="text-xs text-text-muted mt-0.5">Track your 60-min express deliveries and past orders</p>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-surface-card p-1 rounded-full border border-surface-border text-xs font-bold">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-full transition-all ${
              activeTab === 'all' ? 'bg-primary text-surface-base shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-3.5 py-1.5 rounded-full transition-all ${
              activeTab === 'in_progress' ? 'bg-primary text-surface-base shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`px-3.5 py-1.5 rounded-full transition-all ${
              activeTab === 'delivered' ? 'bg-primary text-surface-base shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Delivered
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-text-muted">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-20 text-center bg-surface-card rounded-2xl border border-surface-border p-8 space-y-3">
          <Package className="w-10 h-10 text-text-muted mx-auto" />
          <h3 className="font-headline font-bold text-text-primary text-base">No orders found</h3>
          <p className="text-xs text-text-muted">You have no orders matching the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-surface-border gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-headline font-black text-base text-text-primary">#{order.orderNo}</span>
                  <span className="text-xs text-text-muted">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    {order.fulfilmentStatus.replace('_', ' ')}
                  </span>
                  <span className="font-headline font-black text-sm text-text-primary font-mono">
                    {formatPaise(order.totalPaise)}
                  </span>
                </div>
              </div>

              {/* Items Preview */}
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-surface-raised flex-shrink-0">
                      <Image src={item.image} alt={item.productName} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-text-primary line-clamp-1">{item.productName}</p>
                      <p className="text-[11px] text-text-muted">
                        Size: {item.size} • Color: {item.color} • Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono text-text-primary font-bold">
                      {formatPaise(item.sellingPricePaise * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{order.deliveryMethod === 'express_60' ? '⚡ 60-Min Blitz Hub' : 'Standard Delivery'}</span>
                </div>

                <Link
                  href={`/account/orders/${order.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-text-primary hover:text-primary transition-colors"
                >
                  <span>Track &amp; View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
