'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AdminHeaderProps {
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  } | null;
  onMenuToggle?: () => void;
}

export function AdminHeader({ user, onMenuToggle }: AdminHeaderProps) {
  const displayName = user?.name || 'Operations Executive';
  const displayContact = user?.email || (user?.phone ? `+91 ${user.phone}` : 'admin@muvera.club');
  const initials = (user?.name || 'AD')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'AD';

  return (
    <header className="h-16 bg-surface-base border-b border-surface-border px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu Button & Dark Store Status */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-2 -ml-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-raised lg:hidden flex-shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-500/10 border border-emerald-500/30 px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold text-emerald-400 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="truncate">Dark Store: ONLINE</span>
        </div>
        <span className="text-xs text-text-muted hidden md:inline truncate">
          ⚡ Express Courier SLA Active
        </span>
      </div>

      {/* Right: Admin Profile & Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <ThemeToggle />
        <div className="text-right hidden sm:block">
          <div className="flex items-center justify-end gap-1.5">
            <p className="text-xs font-bold text-text-primary truncate max-w-[140px]">{displayName}</p>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
              {user?.role || 'Admin'}
            </span>
          </div>
          <p className="text-[10px] text-text-muted font-mono truncate max-w-[140px]">{displayContact}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary text-surface-base font-black text-xs flex items-center justify-center shadow-gold-glow flex-shrink-0">
          {initials}
        </div>
      </div>
    </header>
  );
}
