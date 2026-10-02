'use client';

import React, { useState, useEffect } from 'react';
import { formatPaise } from '@/lib/money';
import { Users, MessageCircle, Search, RefreshCw, Phone, ShieldCheck } from 'lucide-react';

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  city: string;
  hub: string;
  ordersCount: number;
  ltvPaise: number;
  tier: string;
  createdAt: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      if (data.customers) {
        setCustomers(data.customers);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      c.tier.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">Customer Directory &amp; LTV</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real registered customer accounts, computed lifetime spend (LTV) &amp; direct VIP concierge
          </p>
        </div>

        <button
          onClick={loadCustomers}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-surface-border text-xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name, phone, email, or tier..."
            className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <span className="text-xs text-text-muted font-bold">
          {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Customer' : 'Customers'}
        </span>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
            <p className="text-xs text-text-muted">Loading live customer accounts from MongoDB Atlas...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-10 h-10 text-text-muted mx-auto opacity-40" />
            <p className="text-sm font-bold text-text-primary">No customers match your search</p>
            <p className="text-xs text-text-muted">When customers register and place orders, they appear here live.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-surface-border text-text-muted font-bold uppercase tracking-wider bg-surface-raised/50">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Contact &amp; Hub</th>
                  <th className="p-4">Orders Placed</th>
                  <th className="p-4">Lifetime Spend (LTV)</th>
                  <th className="p-4">Club Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-raised/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-black text-xs flex items-center justify-center">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary text-sm">{c.name}</p>
                          {c.email && <p className="text-[11px] text-text-muted">{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-text-muted">
                      <p className="font-mono font-bold text-text-primary">{c.phone ? `+91 ${c.phone}` : 'No phone'}</p>
                      <p className="text-[11px]">{c.city} • {c.hub}</p>
                    </td>
                    <td className="p-4 font-mono font-bold text-text-primary">
                      {c.ordersCount} {c.ordersCount === 1 ? 'order' : 'orders'}
                    </td>
                    <td className="p-4 font-mono font-black text-sm text-primary">
                      {formatPaise(c.ltvPaise)}
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {c.tier}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {c.phone ? (
                        <a
                          href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hi ${c.name}! This is the MUVERA dark store VIP team.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>WhatsApp Chat</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-text-muted italic">No phone on file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
