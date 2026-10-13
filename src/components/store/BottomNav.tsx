'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, Compass, Heart, User } from 'lucide-react';
import { useStore } from '@/lib/store-context';

export function BottomNav() {
  const pathname = usePathname();
  const { wishlist } = useStore();

  const tabs = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Categories', href: '/categories', icon: Grid },
    { label: 'Discover', href: '/products', icon: Compass },
    { label: 'Wishlist', href: '/wishlist', icon: Heart, badge: wishlist.length > 0 ? wishlist.length : undefined },
    { label: 'Account', href: '/account', icon: User },
  ];

  // Hide on admin routes
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-base border-t border-surface-border pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive ? 'text-amber-800 dark:text-amber-400 font-bold' : 'text-slate-600 dark:text-zinc-300 hover:text-text-primary'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[1rem] h-[1rem] px-0.5 rounded-full bg-secondary text-white text-[9px] font-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-bold ${isActive ? 'text-amber-800 dark:text-amber-400' : 'text-slate-600 dark:text-zinc-300'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-amber-500 shadow-gold-glow" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
