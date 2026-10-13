'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { OrderSnapshot } from '@/lib/types';
import { formatPaise, calculateGstBreakdown } from '@/lib/money';
import { generateAdminCustomerChatUrl } from '@/lib/whatsapp';
import {
  ShoppingBag,
  MessageCircle,
  CheckCircle,
  Truck,
  Printer,
  ChevronRight,
  RefreshCw,
  Clock,
  User,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderSnapshot[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderSnapshot | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'allocated' | 'shipped'>('all');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (
    orderId: string,
    fulfilmentStatus: any,
    paymentStatus?: any
  ) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          fulfilmentStatus,
          paymentStatus,
          actor: 'Operations Admin Indiranagar',
        }),
      });
      const data = await res.json();
      if (data.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'pending') return o.paymentStatus === 'pending_whatsapp';
    if (activeTab === 'allocated') return o.fulfilmentStatus === 'allocated' || o.fulfilmentStatus === 'packed';
    if (activeTab === 'shipped') return o.fulfilmentStatus === 'shipped';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">
            Order Fulfillment &amp; WhatsApp Desk
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manage live express courier dispatches, payment verification &amp; customer communication
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="bg-surface-card hover:bg-surface-raised border border-surface-border text-xs font-bold text-text-primary px-4 py-2 rounded-full flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-primary" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-card p-1 rounded-full border border-surface-border text-xs font-bold w-full sm:w-fit overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 rounded-full transition-all flex-shrink-0 ${
            activeTab === 'all' ? 'bg-primary text-surface-base shadow-sm' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-1.5 rounded-full transition-all flex-shrink-0 ${
            activeTab === 'pending' ? 'bg-primary text-surface-base shadow-sm' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Pending WhatsApp
        </button>
        <button
          onClick={() => setActiveTab('allocated')}
          className={`px-4 py-1.5 rounded-full transition-all flex-shrink-0 ${
            activeTab === 'allocated' ? 'bg-primary text-surface-base shadow-sm' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Packing Queue
        </button>
        <button
          onClick={() => setActiveTab('shipped')}
          className={`px-4 py-1.5 rounded-full transition-all flex-shrink-0 ${
            activeTab === 'shipped' ? 'bg-primary text-surface-base shadow-sm' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Out for Delivery
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const isPending = order.paymentStatus === 'pending_whatsapp';
          const isAllocated = order.fulfilmentStatus === 'allocated';
          const isPacked = order.fulfilmentStatus === 'packed';
          const isShipped = order.fulfilmentStatus === 'shipped';

          return (
            <div
              key={order.id}
              className="p-4 sm:p-6 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4"
            >
              {/* Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-surface-border gap-2">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="font-headline font-black text-lg text-text-primary">#{order.orderNo}</span>
                  <span className="text-xs font-mono text-text-muted">
                    {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    {order.fulfilmentStatus}
                  </span>
                  {isPending && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      WhatsApp Confirmation Needed
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0">
                  <span className="font-headline font-black text-base text-text-primary font-mono">
                    {formatPaise(order.totalPaise)}
                  </span>
                  <Button
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsInvoiceOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print GST Invoice</span>
                  </Button>
                </div>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Customer Details */}
                <div className="p-3.5 rounded-xl bg-surface-raised border border-surface-border space-y-1">
                  <div className="flex items-center gap-1.5 text-primary font-bold">
                    <User className="w-3.5 h-3.5" />
                    <span>Customer Details</span>
                  </div>
                  <p className="font-bold text-text-primary">{order.customerName}</p>
                  <p className="text-text-muted">{order.customerPhone}</p>
                </div>

                {/* Delivery Address */}
                <div className="p-3.5 rounded-xl bg-surface-raised border border-surface-border space-y-1">
                  <div className="flex items-center gap-1.5 text-primary font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Delivery Address</span>
                  </div>
                  <p className="text-text-muted line-clamp-2">
                    {order.shippingAddress.street}, {order.shippingAddress.city} - {order.shippingAddress.pincode}
                  </p>
                </div>

                {/* Status & Method */}
                <div className="p-3.5 rounded-xl bg-surface-raised border border-surface-border space-y-1">
                  <div className="flex items-center gap-1.5 text-primary font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Method &amp; Hub</span>
                  </div>
                  <p className="font-bold text-text-primary">
                    ⚡ Express Courier Delivery
                  </p>
                  <p className="text-emerald-400 font-bold">Payment: {order.paymentStatus.toUpperCase()}</p>
                </div>
              </div>

              {/* Items Preview */}
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs bg-surface-raised/40 p-2.5 rounded-xl">
                    <div className="relative w-10 h-12 rounded-lg overflow-hidden bg-surface-base flex-shrink-0">
                      <Image src={item.image} alt={item.productName} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-text-primary line-clamp-1">{item.productName}</p>
                      <p className="text-[11px] text-text-muted">
                        Size: {item.size} • SKU: {item.sku} • Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono text-text-primary font-bold">
                      {formatPaise(item.sellingPricePaise * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-border">
                {/* 1-Click WhatsApp Chat Launcher */}
                <a
                  href={generateAdminCustomerChatUrl(order, 'confirm')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Chat with Customer on WhatsApp</span>
                </a>

                {/* Progression Buttons */}
                <div className="flex items-center gap-2">
                  {isPending && (
                    <Button
                      onClick={() => handleUpdateStatus(order.id, 'allocated', 'paid')}
                      size="sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Verify Payment &amp; Allocate Stock</span>
                    </Button>
                  )}

                  {isAllocated && (
                    <Button onClick={() => handleUpdateStatus(order.id, 'packed')} size="sm">
                      <span>Mark as Packed</span>
                    </Button>
                  )}

                  {isPacked && (
                    <Button onClick={() => handleUpdateStatus(order.id, 'shipped')} size="sm">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch Courier / Rider</span>
                    </Button>
                  )}

                  {isShipped && (
                    <Button onClick={() => handleUpdateStatus(order.id, 'delivered')} size="sm">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark as Delivered</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Printable GST Tax Invoice Modal */}
      {isInvoiceOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-zinc-900 rounded-2xl w-full max-w-[min(92vw,42rem)] p-4 sm:p-8 shadow-2xl space-y-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-2xl font-black tracking-wider text-black">MUVERA LUXURY COMMERCE</h2>
                <p className="text-xs text-zinc-600">GSTIN: 29AABCM1234F1Z8 • Indiranagar Hub, Bengaluru</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold bg-zinc-100 px-2 py-1 rounded text-zinc-700">
                  TAX INVOICE
                </span>
                <p className="text-sm font-mono font-bold mt-1">Invoice: #{selectedOrder.orderNo}</p>
                <p className="text-xs text-zinc-500">{new Date(selectedOrder.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="text-xs grid grid-cols-2 gap-4">
              <div>
                <p className="font-bold text-zinc-500 uppercase">Customer Information:</p>
                <p className="font-bold text-sm text-black">{selectedOrder.customerName}</p>
                <p>{selectedOrder.customerPhone}</p>
              </div>
              <div>
                <p className="font-bold text-zinc-500 uppercase">Delivery Address:</p>
                <p>{selectedOrder.shippingAddress.street}</p>
                <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.pincode}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-xs text-left border border-zinc-200">
              <thead className="bg-zinc-100 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-2">Item Description</th>
                  <th className="p-2">Size</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Unit Price</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {selectedOrder.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-bold">{item.productName} ({item.sku})</td>
                    <td className="p-2">{item.size}</td>
                    <td className="p-2 text-center">{item.quantity}</td>
                    <td className="p-2 text-right font-mono">{formatPaise(item.sellingPricePaise)}</td>
                    <td className="p-2 text-right font-mono">{formatPaise(item.sellingPricePaise * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tax Breakdown */}
            <div className="text-xs space-y-1 text-right border-t border-zinc-200 pt-3">
              <p>Subtotal: <span className="font-mono font-bold">{formatPaise(selectedOrder.subtotalPaise)}</span></p>
              {selectedOrder.discountPaise > 0 && (
                <p className="text-emerald-600">Discount: -{formatPaise(selectedOrder.discountPaise)}</p>
              )}
              <p>CGST (6%): <span className="font-mono">{formatPaise(calculateGstBreakdown(selectedOrder.totalPaise).cgstPaise)}</span></p>
              <p>SGST (6%): <span className="font-mono">{formatPaise(calculateGstBreakdown(selectedOrder.totalPaise).sgstPaise)}</span></p>
              <p className="text-base font-black pt-2 border-t border-zinc-200">
                Total Payable: <span className="font-mono">{formatPaise(selectedOrder.totalPaise)}</span>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200">
              <button
                onClick={() => setIsInvoiceOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-zinc-800 text-xs font-bold"
              >
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
