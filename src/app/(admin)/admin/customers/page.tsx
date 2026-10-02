'use client';

import React from 'react';
import { formatPaise } from '@/lib/money';
import { Users, MessageCircle, Phone, MapPin } from 'lucide-react';

export default function AdminCustomersPage() {
  const customers = [
    {
      id: 'cust_1',
      name: 'Aditya Kashyap',
      phone: '9845012345',
      city: 'Bengaluru',
      ordersCount: 4,
      ltvPaise: 1420000, // ₹14,200
      tier: 'MUVERA Black VIP',
      lastActive: 'Today, 2:10 PM',
    },
    {
      id: 'cust_2',
      name: 'Priya Sharma',
      phone: '9916054321',
      city: 'Bengaluru',
      ordersCount: 2,
      ltvPaise: 680000, // ₹6,800
      tier: 'Gold Member',
      lastActive: 'Today, 1:40 PM',
    },
    {
      id: 'cust_3',
      name: 'Rohit Roy',
      phone: '9880199221',
      city: 'Bengaluru',
      ordersCount: 3,
      ltvPaise: 1140000,
      tier: 'MUVERA Black VIP',
      lastActive: 'Yesterday',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">Customer Directory &amp; LTV</h1>
        <p className="text-xs text-text-muted mt-0.5">
          View customer lifetime value, dark store loyalty tiers &amp; direct concierge communication
        </p>
      </div>

      <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-xl">
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
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-4 font-bold text-text-primary text-sm">{c.name}</td>
                  <td className="p-4 text-text-muted">
                    <p className="font-mono text-text-primary">{c.phone}</p>
                    <p className="text-[11px]">{c.city} (Indiranagar Hub)</p>
                  </td>
                  <td className="p-4 font-mono font-bold text-text-primary">{c.ordersCount} orders</td>
                  <td className="p-4 font-mono font-black text-sm text-primary">
                    {formatPaise(c.ltvPaise)}
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      {c.tier}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <a
                      href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hi ${c.name}! This is the MUVERA dark store VIP team.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp Chat</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
