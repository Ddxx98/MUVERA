'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { getCurrentUserAction, logoutAction } from '@/modules/auth/actions';
import { UserProfile } from '@/modules/auth/types';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  User,
  Package,
  Heart,
  MapPin,
  ShieldCheck,
  Crown,
  ChevronRight,
  LogOut,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AccountPage() {
  const router = useRouter();
  const { wishlist } = useStore();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const current = await getCurrentUserAction();
        setUser(current);
      } catch (err) {
        console.error('Failed to load user session:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-text-muted">
        Loading VIP account profile...
      </div>
    );
  }

  // Guest State: Not logged in
  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 space-y-6 text-center">
        <div className="p-8 rounded-3xl bg-surface-card border border-surface-border shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center text-primary">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="font-headline font-black text-2xl text-text-primary">Sign in to MUVERA</h1>
            <p className="text-xs text-text-muted">
              Unlock 60-minute express tracking, saved fits, and exclusive member perks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={() => router.push('/login')} size="lg" fullWidth>
              Sign In
            </Button>
            <Button onClick={() => router.push('/signup')} variant="outline" size="lg" fullWidth>
              Create Account
            </Button>
          </div>

          <div className="pt-4 border-t border-surface-border flex items-center justify-center gap-2">
            <ThemeToggle showLabel />
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Profile Overview Card */}
      <div className="p-6 rounded-3xl bg-surface-card border border-surface-border shadow-xl flex flex-col sm:flex-row items-center gap-6 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center font-headline font-black text-2xl text-surface-base shadow-gold-glow">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="font-headline font-black text-xl text-text-primary">{user.name}</h1>
              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                isAdmin
                  ? 'bg-primary/20 text-primary border-primary/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isAdmin ? <Crown className="w-3 h-3 fill-current" /> : <Sparkles className="w-3 h-3 fill-current" />}
                {isAdmin ? 'ADMINISTRATOR' : user.loyaltyTier.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-text-muted font-mono">{user.phone} • {user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-1.5">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/account/orders"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-sm text-text-primary">Orders &amp; Tracking</h3>
              <p className="text-[11px] text-text-muted">Live dispatch &amp; returns</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/wishlist"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-sm text-text-primary">Saved Fits</h3>
              <p className="text-[11px] text-text-muted">{wishlist.length} items saved</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
        </Link>

        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-sm text-text-primary">VIP Member Status</h3>
              <p className="text-[11px] text-text-muted">Free returns &amp; Express SLA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Addresses Section */}
      <div className="p-6 rounded-3xl bg-surface-card border border-surface-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-headline font-bold text-base text-text-primary">Saved Delivery Addresses</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {user.addresses && user.addresses.length > 0 ? (
            user.addresses.map((addr, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-surface-raised border border-surface-border space-y-2 relative"
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-text-primary">{addr.fullName}</h4>
                  {addr.isDefault && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                      DEFAULT
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  {addr.street}{addr.apartment ? `, ${addr.apartment}` : ''}, {addr.city} - {addr.pincode}
                </p>
                <p className="text-[11px] text-text-muted font-mono">{addr.phone}</p>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-4 text-center text-xs text-text-muted border border-dashed border-surface-border rounded-xl">
              No addresses saved yet. Addresses entered at checkout will be remembered here automatically.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
