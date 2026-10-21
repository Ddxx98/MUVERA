'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { env } from '@/config/env';
import { useStore } from '@/lib/store-context';
import { Zap, RotateCcw, ShieldCheck, MessageCircle, Heart } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();
  const { siteSettings } = useStore();
  const whatsappNum = (siteSettings?.whatsappNumber || env.whatsappNumber).replace(/\D/g, '');

  if (pathname.startsWith('/admin')) return null;
  return (
    <footer className="bg-surface-base border-t border-surface-border text-slate-700 dark:text-zinc-300 text-xs pb-24 md:pb-12">
      {/* Value Propositions Grid */}
      <div className="border-b border-surface-border py-8 bg-surface-raised/40">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-amber-800 dark:text-primary flex-shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h4 className="font-headline font-bold text-text-primary text-sm">Express Delivery</h4>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">Fast courier dispatch across India</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-amber-800 dark:text-primary flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-headline font-bold text-text-primary text-sm">Quality Guaranteed</h4>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">Inspected prior to dispatch</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-amber-800 dark:text-primary flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-headline font-bold text-text-primary text-sm">100% Authentic</h4>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">Direct from official labels</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 flex-shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-headline font-bold text-text-primary text-sm">WhatsApp VIP Support</h4>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">Direct concierge chat</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Info */}
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="MUVERA"
              width={140}
              height={38}
              className="h-8 w-auto object-contain"
            />
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-surface-card text-text-primary border border-surface-border">
              Club
            </span>
          </Link>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Midnight Quick-Glam luxury fashion &amp; streetwear commerce. Engineered for high-speed delivery straight to your wardrobe with express courier shipping.
          </p>
          <a
            href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent('Hello MUVERA VIP Concierge! I have a question about drops.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-600/20 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-600/30 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-headline font-bold text-text-primary text-sm mb-3 uppercase tracking-wider">Collections</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/products?category=oversized-tees" className="text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Oversized T-Shirts</Link></li>
            <li><Link href="/products?category=hoodies" className="text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Heavyweight Hoodies</Link></li>
            <li><Link href="/products?category=cargoes" className="text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Parachutes & Cargoes</Link></li>
            <li><Link href="/products?category=jackets" className="text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Satin Bombers & Coats</Link></li>
            <li><Link href="/products?category=party-fits" className="text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Club & Party Fits</Link></li>
          </ul>
        </div>

        {/* The MUVERA Standard */}
        <div>
          <h4 className="font-headline font-bold text-text-primary text-sm mb-3 uppercase tracking-wider">The MUVERA Standard</h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
            <li>100% In-House Luxury Design</li>
            <li>Heavyweight Japanese &amp; French Fabrics</li>
            <li>Fast Express Courier Dispatch</li>
            <li>Zero-Risk WhatsApp Concierge Booking</li>
            <li>Limited Edition Numbered Drops</li>
          </ul>
        </div>

        {/* Customer Care & Services */}
        <div>
          <h4 className="font-headline font-bold text-text-primary text-sm mb-3 uppercase tracking-wider">Customer Care</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/account" className="text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">My Profile &amp; Preferences</Link></li>
            <li><Link href="/account/orders" className="text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Orders &amp; Tracking</Link></li>
            <li><Link href="/wishlist" className="text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Saved Fits &amp; Wishlist</Link></li>
            <li><Link href="/categories" className="text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Browse All Collections</Link></li>
            {siteSettings?.supportEmail && (
              <li className="pt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                Email: <a href={`mailto:${siteSettings.supportEmail}`} className="hover:text-primary transition-colors font-medium">{siteSettings.supportEmail}</a>
              </li>
            )}
            {siteSettings?.supportPhone && (
              <li className="text-[11px] text-slate-500 dark:text-zinc-400">
                Phone: <span className="font-medium text-text-primary">{siteSettings.supportPhone}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-surface-border max-w-7xl mx-auto px-4 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-zinc-400">
        <p>© 2026 {siteSettings?.businessName || 'MUVERA Luxury Commerce Ltd'}. All rights reserved.</p>
        <p className="flex items-center gap-1">
          Crafted with <Heart className="w-3 h-3 text-secondary fill-current" /> for rapid fashion delivery.
        </p>
      </div>
    </footer>
  );
}
