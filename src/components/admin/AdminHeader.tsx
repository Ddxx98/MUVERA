'use client';

import React from 'react';
import { ShieldCheck, Zap, Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AdminHeaderProps {
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  } | null;
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const displayName = user?.name || 'Operations Executive';
  const displayContact = user?.email || (user?.phone ? `+91 ${user.phone}` : 'admin@muvera.club');
  const initials = (user?.name || 'AD')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'AD';

  return (
    <header className="h-16 bg-surface-base border-b border-surface-border px-6 flex items-center justify-between">
      {/* Dark Store Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Indiranagar Dark Store: ONLINE</span>
        </div>
        <span className="text-xs text-text-muted hidden sm:inline">⚡ 60-Min Express Fulfillment SLA Active</span>
      </div>

      {/* Admin Profile & Theme Toggle */}
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <p className="text-xs font-bold text-text-primary">{displayName}</p>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
              {user?.role || 'Admin'}
            </span>
          </div>
          <p className="text-[10px] text-text-muted font-mono">{displayContact}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary text-surface-base font-black text-xs flex items-center justify-center shadow-gold-glow">
          {initials}
        </div>
      </div>
    </header>
  );
}
