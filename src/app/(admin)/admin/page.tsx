import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { formatPaise } from '@/lib/money';
import {
  TrendingUp,
  ShoppingBag,
  Boxes,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  MessageCircle,
  Zap,
  Users,
} from 'lucide-react';
import { generateAdminCustomerChatUrl } from '@/lib/whatsapp';

export default async function AdminDashboardPage() {
  const [orders, inventory, products, users] = await Promise.all([
    db.getOrders(),
    db.getInventory(),
    db.getProducts(),
    db.getUsers(),
  ]);

  // Metrics
  const totalGmvPaise = orders.reduce((sum, o) => sum + o.totalPaise, 0);
  const totalOrders = orders.length;
  const aovPaise = totalOrders > 0 ? Math.round(totalGmvPaise / totalOrders) : 0;
  const lowStockItems = inventory.filter((i) => i.available <= i.lowStockThreshold);
  const pendingWhatsAppOrders = orders.filter((o) => o.paymentStatus === 'pending_whatsapp');
  const totalCustomers = users.filter((u) => u.role !== 'admin').length || users.length;

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">Executive Operations Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time telemetry • Indiranagar Hub • Express Dark Store Operations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/inventory"
            className="bg-primary hover:bg-primary-hover text-surface-base font-bold text-xs px-4 py-2 rounded-full shadow-gold-glow flex items-center gap-1.5 transition-all"
          >
            <Boxes className="w-4 h-4" />
            <span>Manage Inventory</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* GMV */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-2 shadow-lg">
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Merchandise Value</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline font-black text-2xl text-text-primary font-mono">{formatPaise(totalGmvPaise)}</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Live</span>
          </div>
          <p className="text-[11px] text-text-muted">Total sales across dark stores</p>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-2 shadow-lg">
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline font-black text-2xl text-text-primary font-mono">{totalOrders}</span>
            <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Express SLA</span>
          </div>
          <p className="text-[11px] text-text-muted">Fast courier fulfillment dispatch</p>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-2 shadow-lg">
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">Average Order Value</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline font-black text-2xl text-text-primary font-mono">{formatPaise(aovPaise)}</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">AOV</span>
          </div>
          <p className="text-[11px] text-text-muted">Multi-item luxury carts</p>
        </div>

        {/* Registered Customers */}
        <Link href="/admin/customers" className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-2 shadow-lg hover:border-primary/50 transition-all block">
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">Registered Users</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline font-black text-2xl text-text-primary font-mono">{totalCustomers}</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Atlas DB</span>
          </div>
          <p className="text-[11px] text-text-muted">Active accounts in MongoDB</p>
        </Link>

        {/* Low Stock Alerts */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-2 shadow-lg">
          <div className="flex justify-between items-center text-text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Alerts</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline font-black text-2xl text-amber-400 font-mono">{lowStockItems.length}</span>
            <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">SKUs</span>
          </div>
          <p className="text-[11px] text-text-muted">Below safe threshold (3 units)</p>
        </div>
      </div>


      {/* Two Columns: Low Stock Table & Pending WhatsApp Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending WhatsApp Orders (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              <h2 className="font-headline font-bold text-base text-text-primary">Pending WhatsApp Orders</h2>
            </div>
            <Link href="/admin/orders" className="text-xs font-bold text-primary hover:underline">
              View All Orders →
            </Link>
          </div>

          {pendingWhatsAppOrders.length === 0 ? (
            <p className="text-xs text-text-muted py-6 text-center">No pending WhatsApp orders right now.</p>
          ) : (
            <div className="space-y-3">
              {pendingWhatsAppOrders.map((o) => (
                <div
                  key={o.id}
                  className="p-3.5 rounded-xl bg-surface-raised border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-sm text-text-primary">#{o.orderNo}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Awaiting Payment Proof
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {o.customerName} ({o.customerPhone}) • {formatPaise(o.totalPaise)}
                    </p>
                  </div>

                  <a
                    href={generateAdminCustomerChatUrl(o, 'confirm')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-full flex items-center justify-center gap-1.5 transition-all shadow-md self-start sm:self-auto"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    <span>Open WhatsApp</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="font-headline font-bold text-base text-text-primary">Low Stock Warning</h2>
            </div>
            <Link href="/admin/inventory" className="text-xs font-bold text-primary hover:underline">
              Restock →
            </Link>
          </div>

          <div className="space-y-2.5">
            {lowStockItems.slice(0, 4).map((item) => (
              <div
                key={item.sku}
                className="p-3 rounded-xl bg-surface-raised border border-surface-border flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-mono font-bold text-text-primary">{item.sku}</p>
                  <p className="text-[11px] text-text-muted">Indiranagar Dark Store Hub</p>
                </div>
                <div className="text-right">
                  <span className="font-headline font-black text-sm text-amber-400 font-mono">
                    {item.available} Left
                  </span>
                  <p className="text-[10px] text-text-muted">Threshold: {item.lowStockThreshold}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
