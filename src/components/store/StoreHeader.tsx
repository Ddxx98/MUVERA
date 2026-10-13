'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { Search, Heart, ShoppingBag, Zap, User, LogOut } from 'lucide-react';
import { getCurrentUserAction, logoutAction } from '@/modules/auth/actions';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function StoreHeader() {
  const pathname = usePathname();
  const { cart, wishlist, setIsCartDrawerOpen } = useStore();
  const [announcement, setAnnouncement] = useState('⚡ FAST DISPATCH • Free Express Shipping above ₹999');
  const [announcementActive, setAnnouncementActive] = useState(true);

  const [currentUser, setCurrentUser] = useState<any>(null);

  React.useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) {
          if (d.settings.topAnnouncementText) setAnnouncement(d.settings.topAnnouncementText);
          if (d.settings.topAnnouncementActive !== undefined) setAnnouncementActive(d.settings.topAnnouncementActive);
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    getCurrentUserAction().then((u) => setCurrentUser(u)).catch(() => {});
  }, [pathname]);

  const handleStoreLogout = async () => {
    await logoutAction();
    setCurrentUser(null);
    window.location.href = '/login';
  };

  if (pathname.startsWith('/admin')) return null;

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface-base/90 backdrop-blur-xl border-b border-surface-border">
        {/* Top Marquee Announcement Bar */}
        {announcementActive && (
          <div className="bg-gradient-to-r from-secondary-container via-surface-card to-surface-raised py-1 px-4 text-center text-[11px] font-bold text-text-surface flex items-center justify-center gap-2 overflow-hidden">
            <span className="flex items-center gap-1 text-primary">
              <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
            </span>
            <span>{announcement}</span>
          </div>
        )}

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Location */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group">
              <Image
                src="/logo.svg"
                alt="MUVERA"
                width={130}
                height={35}
                className="h-6 sm:h-8 w-auto object-contain group-hover:opacity-90 transition-opacity"
                priority
              />
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-surface-card text-text-primary border border-surface-border">
                Club
              </span>
            </Link>
          </div>

          {/* Desktop Search Bar Trigger */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <Link
              href="/search"
              className="w-full flex items-center justify-between bg-surface-raised hover:bg-surface-card border border-surface-border px-4 py-2 rounded-full text-xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-800 dark:text-primary" />
                <span className="text-slate-700 dark:text-zinc-300">Search MUVERA luxury streetwear, bombers, tees...</span>
              </div>
              <span className="text-[10px] bg-surface-card px-2 py-0.5 rounded text-slate-700 dark:text-zinc-300 font-mono border border-surface-border/50">/</span>
            </Link>
          </div>

          {/* Header Action Icons */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Mobile Search Icon */}
            <Link
              href="/search"
              aria-label="Search"
              className="md:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-text-surface hover:bg-surface-raised"
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* Wishlist Link */}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-text-surface hover:bg-surface-raised transition-colors"
            >
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-secondary" />
              )}
            </Link>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              aria-label="Shopping Bag"
              className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-surface-raised hover:bg-surface-card border border-surface-border text-primary transition-all duration-200 active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1rem] sm:min-w-[1.125rem] h-[1rem] sm:h-[1.125rem] px-1 rounded-full bg-primary text-surface-base text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-md">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <ThemeToggle className="!p-1.5 sm:!p-2 !rounded-full" />

            {/* Profile */}
            <Link
              href="/account"
              aria-label="Account"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-text-surface hover:bg-surface-raised transition-colors"
              title={currentUser ? `Signed in as ${currentUser.name}` : 'My Account'}
            >
              <User className="w-4 h-4" />
            </Link>

            {/* Sign Out (Visible when logged in) */}
            {currentUser && (
              <button
                type="button"
                onClick={handleStoreLogout}
                aria-label="Sign Out"
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
