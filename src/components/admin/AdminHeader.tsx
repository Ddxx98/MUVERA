'use client';

import React from 'react';
import { ShieldCheck, Zap, Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function AdminHeader() {
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
          <p className="text-xs font-bold text-text-primary">Executive Admin</p>
          <p className="text-[10px] text-text-muted font-mono">admin@muvera.club</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary text-surface-base font-black text-xs flex items-center justify-center shadow-gold-glow">
          AD
        </div>
      </div>
    </header>
  );
}
