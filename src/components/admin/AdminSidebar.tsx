'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  Layers,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Users,
  Cpu,
  SlidersHorizontal,
  ArrowLeft,
  X,
  LogOut,
} from 'lucide-react';
import { logoutAction } from '@/modules/auth/actions';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const links = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Real-Time Inventory', href: '/admin/inventory', icon: Boxes },
    { label: 'Product Catalog', href: '/admin/catalog', icon: Layers },
    { label: 'Orders & WhatsApp Queue', href: '/admin/orders', icon: ShoppingBag },
    { label: 'Returns & Refunds', href: '/admin/returns', icon: RotateCcw },
    { label: 'Merchandising & Coupons', href: '/admin/merchandising', icon: Sparkles },
    { label: 'Customer Directory', href: '/admin/customers', icon: Users },
    { label: 'Site Settings & CMS', href: '/admin/settings', icon: SlidersHorizontal },
    { label: 'System & Stock Audit', href: '/admin/system', icon: Cpu },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-surface-base border-r border-surface-border flex flex-col justify-between transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:w-64 lg:z-auto flex-shrink-0 min-h-screen
          ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div>
          <div className="p-4 sm:p-6 border-b border-surface-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.svg"
                  alt="MUVERA"
                  width={110}
                  height={30}
                  className="h-6 w-auto object-contain"
                />
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-surface-card text-emerald-400 border border-emerald-500/30">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">Dark Store Operations</p>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => onClose?.()}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-surface-base shadow-gold-glow'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-raised'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Exit to Storefront & Logout */}
        <div className="p-4 border-t border-surface-border space-y-2">
          <Link
            href="/"
            onClick={() => onClose?.()}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-surface-border text-xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit to Storefront</span>
          </Link>

          <button
            type="button"
            onClick={async () => {
              onClose?.();
              await logoutAction();
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
