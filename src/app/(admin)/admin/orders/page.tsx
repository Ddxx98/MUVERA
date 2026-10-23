'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { OrderSnapshot, FulfilmentStatus, PaymentStatus, OrderStatus } from '@/lib/types';
import { formatPaise, calculateGstBreakdown } from '@/lib/money';
import { generateAdminCustomerChatUrl } from '@/lib/whatsapp';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import {
  ShoppingBag,
  MessageCircle,
  CheckCircle,
  Truck,
  Printer,
  Download,
  RefreshCw,
  Clock,
  User,
  MapPin,
  Edit3,
  XCircle,
  X,
  FileText,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderSnapshot[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderSnapshot | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderSnapshot | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'allocated' | 'shipped' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<any>(null);

  // Edit modal form state
  const [editFulfilmentStatus, setEditFulfilmentStatus] = useState<FulfilmentStatus>('unfulfilled');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('pending_whatsapp');
  const [editOrderStatus, setEditOrderStatus] = useState<OrderStatus>('open');
  const [editTrackingNumber, setEditTrackingNumber] = useState('');
  const [editAdminNote, setEditAdminNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadOrders = async () => {
    try {
      const [res, settingsRes] = await Promise.all([
        fetch('/api/orders').then((r) => r.json()).catch(() => ({})),
        fetch('/api/settings').then((r) => r.json()).catch(() => ({})),
      ]);
      if (res.orders) setOrders(res.orders);
      if (settingsRes.settings) setSiteSettings(settingsRes.settings);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (
    orderId: string,
    updates: {
      fulfilmentStatus?: FulfilmentStatus;
      paymentStatus?: PaymentStatus;
      orderStatus?: OrderStatus;
      trackingNumber?: string;
      adminNote?: string;
    }
  ) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          ...updates,
          actor: 'Operations Admin Indiranagar',
        }),
      });
      const data = await res.json();
      if (data.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(data.order);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openEditModal = (order: OrderSnapshot) => {
    setEditingOrder(order);
    setEditFulfilmentStatus(order.fulfilmentStatus);
    setEditPaymentStatus(order.paymentStatus);
    setEditOrderStatus(order.orderStatus);
    setEditTrackingNumber(order.trackingNumber || '');
    setEditAdminNote('');
  };

  const handleSaveModalEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: editingOrder.id,
          fulfilmentStatus: editFulfilmentStatus,
          paymentStatus: editPaymentStatus,
          orderStatus: editOrderStatus,
          trackingNumber: editTrackingNumber,
          adminNote: editAdminNote.trim() || undefined,
          actor: 'Operations Admin Indiranagar',
        }),
      });
      const data = await res.json();
      if (data.order) {
        setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? data.order : o)));
        setEditingOrder(null);
      }
    } catch (err) {
      console.error('Failed to save manual edit:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'pending') return o.paymentStatus === 'pending_whatsapp' && o.orderStatus !== 'cancelled';
    if (activeTab === 'allocated') return (o.fulfilmentStatus === 'allocated' || o.fulfilmentStatus === 'packed') && o.orderStatus !== 'cancelled';
    if (activeTab === 'shipped') return (o.fulfilmentStatus === 'shipped' || o.fulfilmentStatus === 'out_for_delivery') && o.orderStatus !== 'cancelled';
    if (activeTab === 'cancelled') return o.fulfilmentStatus === 'cancelled' || o.orderStatus === 'cancelled';
    return true;
  });

  const pendingCount = orders.filter((o) => o.paymentStatus === 'pending_whatsapp' && o.orderStatus !== 'cancelled').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">
            Order Fulfillment &amp; WhatsApp Desk
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manual order status editing, live WhatsApp booking verification &amp; express dark store dispatches
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
          className={`px-4 py-1.5 rounded-full transition-all flex-shrink-0 flex items-center gap-1.5 ${
            activeTab === 'pending' ? 'bg-primary text-surface-base shadow-sm' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span>Pending WhatsApp</span>
          {pendingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-black">
              {pendingCount}
            </span>
          )}
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
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-1.5 rounded-full transition-all flex-shrink-0 ${
            activeTab === 'cancelled' ? 'bg-primary text-surface-base shadow-sm' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Cancelled
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-text-muted bg-surface-card rounded-2xl border border-surface-border">
            Loading order fulfillment queue...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-muted bg-surface-card rounded-2xl border border-surface-border">
            No orders found in this category.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPending = order.paymentStatus === 'pending_whatsapp' && order.orderStatus !== 'cancelled';
            const isAllocated = order.fulfilmentStatus === 'allocated' && order.orderStatus !== 'cancelled';
            const isPacked = order.fulfilmentStatus === 'packed' && order.orderStatus !== 'cancelled';
            const isShipped = (order.fulfilmentStatus === 'shipped' || order.fulfilmentStatus === 'out_for_delivery') && order.orderStatus !== 'cancelled';
            const isCancelled = order.fulfilmentStatus === 'cancelled' || order.orderStatus === 'cancelled';
            const isBusy = actionLoadingId === order.id;

            const chatType = isPending
              ? 'confirm'
              : order.fulfilmentStatus === 'delivered'
              ? 'delivered'
              : isShipped || isPacked
              ? 'dispatch'
              : 'confirm';

            // Latest timeline event
            const latestEvent = order.timeline && order.timeline.length > 0 ? order.timeline[order.timeline.length - 1] : null;

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
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      isCancelled
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : order.fulfilmentStatus === 'delivered'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-primary/20 text-primary border-primary/30'
                    }`}>
                      Fulfillment: {order.fulfilmentStatus}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      order.paymentStatus === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : isPending
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                        : 'bg-surface-raised text-text-muted border-surface-border'
                    }`}>
                      Payment: {order.paymentStatus.replace('_', ' ')}
                    </span>
                    {order.trackingNumber && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        AWB: {order.trackingNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0">
                    <span className="font-headline font-black text-base text-text-primary font-mono mr-2">
                      {formatPaise(order.totalPaise)}
                    </span>
                    <Button
                      onClick={() => openEditModal(order)}
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-primary" />
                      <span>Edit Status</span>
                    </Button>
                    <Button
                      onClick={() => generateInvoicePdf(order, siteSettings)}
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center gap-1.5"
                      title="Download GST Tax Invoice PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-primary" />
                      <span>PDF</span>
                    </Button>
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
                      <span>View</span>
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
                    {order.customerEmail && <p className="text-[11px] text-text-muted truncate">{order.customerEmail}</p>}
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
                      <span>Order Timeline &amp; State</span>
                    </div>
                    <p className="font-bold text-text-primary">
                      Status: <span className="uppercase text-primary">{order.orderStatus}</span>
                    </p>
                    {latestEvent && (
                      <p className="text-[11px] text-text-muted line-clamp-2 italic">
                        &quot;{latestEvent.description}&quot;
                      </p>
                    )}
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
                    href={generateAdminCustomerChatUrl(order, chatType)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>Chat with Customer on WhatsApp</span>
                  </a>

                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isPending && (
                      <>
                        <Button
                          disabled={isBusy}
                          onClick={() =>
                            handleUpdateStatus(order.id, {
                              fulfilmentStatus: 'allocated',
                              paymentStatus: 'paid',
                              adminNote: 'Admin confirmed WhatsApp payment & placed order.',
                            })
                          }
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Confirm Order Placed</span>
                        </Button>
                        <Button
                          disabled={isBusy}
                          onClick={() =>
                            handleUpdateStatus(order.id, {
                              fulfilmentStatus: 'cancelled',
                              orderStatus: 'cancelled',
                              adminNote: 'Order booking cancelled by admin on WhatsApp desk.',
                            })
                          }
                          variant="outline"
                          size="sm"
                          className="text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Order</span>
                        </Button>
                      </>
                    )}

                    {isAllocated && (
                      <Button
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(order.id, { fulfilmentStatus: 'packed' })}
                        size="sm"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Mark as Packed</span>
                      </Button>
                    )}

                    {isPacked && (
                      <Button
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(order.id, { fulfilmentStatus: 'shipped' })}
                        size="sm"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatch Courier</span>
                      </Button>
                    )}

                    {isShipped && (
                      <Button
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(order.id, { fulfilmentStatus: 'delivered' })}
                        size="sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark as Delivered</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Edit Order Status Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border text-text-primary rounded-2xl w-full max-w-xl mx-4 p-4 sm:p-6 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-surface-border pb-3">
              <div>
                <h2 className="text-lg font-black font-headline text-text-primary flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-primary" />
                  <span>Manual Edit Order #{editingOrder.orderNo}</span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Update fulfillment, payment, courier tracking and log admin notes.
                </p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalEdit} className="space-y-4 text-xs">
              {/* Order Status */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-muted uppercase tracking-wider text-[11px]">
                  Overall Order Status
                </label>
                <select
                  value={editOrderStatus}
                  onChange={(e) => setEditOrderStatus(e.target.value as OrderStatus)}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl px-3 py-2 text-text-primary font-medium focus:outline-none focus:border-primary"
                >
                  <option value="open">Open (Active)</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled (Releases Stock)</option>
                </select>
              </div>

              {/* Fulfilment Status */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-muted uppercase tracking-wider text-[11px]">
                  Fulfillment Status
                </label>
                <select
                  value={editFulfilmentStatus}
                  onChange={(e) => setEditFulfilmentStatus(e.target.value as FulfilmentStatus)}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl px-3 py-2 text-text-primary font-medium focus:outline-none focus:border-primary"
                >
                  <option value="unfulfilled">Unfulfilled (Pending Confirmation)</option>
                  <option value="allocated">Allocated (Order Placed &amp; Stock Committed)</option>
                  <option value="picking">Picking</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled (Releases Stock)</option>
                </select>
              </div>

              {/* Payment Status */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-muted uppercase tracking-wider text-[11px]">
                  Payment Status
                </label>
                <select
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl px-3 py-2 text-text-primary font-medium focus:outline-none focus:border-primary"
                >
                  <option value="pending_whatsapp">Pending WhatsApp (Awaiting Customer Proof)</option>
                  <option value="paid">Paid (Payment Verified &amp; Invoice Generated)</option>
                  <option value="authorized">Authorized (Cash on Delivery Confirmed)</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {/* Courier Tracking */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-muted uppercase tracking-wider text-[11px]">
                  Courier Tracking / AWB Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. BLUEDART-8892182 or SHADOWFAX-9921"
                  value={editTrackingNumber}
                  onChange={(e) => setEditTrackingNumber(e.target.value)}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl px-3 py-2 text-text-primary font-mono focus:outline-none focus:border-primary"
                />
              </div>

              {/* Custom Admin Note */}
              <div className="space-y-1.5">
                <label className="font-bold text-text-muted uppercase tracking-wider text-[11px]">
                  Append Admin Note to Timeline
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer sent UPI payment screenshot on WhatsApp. Verified by Indiranagar manager."
                  value={editAdminNote}
                  onChange={(e) => setEditAdminNote(e.target.value)}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Timeline History Collapsible Preview */}
              <div className="pt-2 border-t border-surface-border space-y-2">
                <p className="font-bold text-text-muted uppercase text-[10px] tracking-wider">
                  Timeline History ({editingOrder.timeline?.length || 0} events)
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {editingOrder.timeline?.map((ev, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-surface-raised/50 border border-surface-border text-[11px]">
                      <div className="flex justify-between text-text-muted text-[10px]">
                        <span className="font-bold text-primary">{ev.actor}</span>
                        <span>{new Date(ev.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      <p className="text-text-primary mt-0.5">{ev.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface-border text-text-muted hover:text-text-primary text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isSavingEdit}
                  size="sm"
                  className="px-5 font-bold"
                >
                  {isSavingEdit ? 'Saving Changes...' : 'Save Order Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable GST Tax Invoice Modal */}
      {isInvoiceOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-zinc-900 rounded-2xl w-full max-w-2xl mx-4 p-4 sm:p-8 shadow-2xl space-y-6 max-h-[90dvh] overflow-y-auto">
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
                className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-xs font-bold text-zinc-800"
              >
                Close
              </button>
              <button
                onClick={() => generateInvoicePdf(selectedOrder, siteSettings)}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-zinc-800 text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
