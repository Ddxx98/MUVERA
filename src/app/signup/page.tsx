'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { registerAction } from '@/modules/auth/actions';
import { ShieldCheck, User, Mail, Phone, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function CustomerSignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Please provide your full name.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Please provide a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerAction({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      if (!res.ok) {
        setError(res.error.message);
        setLoading(false);
        return;
      }

      router.push('/account');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="p-8 rounded-3xl bg-surface-card border border-surface-border shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Image
              src="/logo.svg"
              alt="MUVERA"
              width={140}
              height={38}
              className="h-8 w-auto object-contain mx-auto"
              priority
            />
          </div>
          <h1 className="font-headline font-bold text-xl text-text-primary">Create Your Account</h1>
          <p className="text-xs text-text-muted">
            Unlock 60-minute express drops, VIP access &amp; instant WhatsApp checkout
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="text-xs font-bold text-text-muted mb-1 block">Full Name *</label>
            <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
              <User className="w-4 h-4 text-text-muted mr-2 flex-shrink-0" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
                className="w-full bg-transparent text-xs text-text-primary font-medium focus:outline-none placeholder:text-text-muted/60"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-bold text-text-muted mb-1 block">Email Address *</label>
            <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
              <Mail className="w-4 h-4 text-text-muted mr-2 flex-shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full bg-transparent text-xs text-text-primary font-medium focus:outline-none placeholder:text-text-muted/60"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold text-text-muted mb-1 block">WhatsApp Mobile Number *</label>
            <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
              <span className="text-xs font-bold text-primary mr-2 pr-2 border-r border-surface-border">+91</span>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                className="w-full bg-transparent text-xs text-text-primary font-mono font-bold focus:outline-none placeholder:text-text-muted/60"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-bold text-text-muted mb-1 block">Create Password *</label>
            <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
              <Lock className="w-4 h-4 text-text-muted mr-2 flex-shrink-0" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-transparent text-xs text-text-primary font-medium focus:outline-none placeholder:text-text-muted/60"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-xs font-bold text-text-muted mb-1 block">Confirm Password *</label>
            <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
              <Lock className="w-4 h-4 text-text-muted mr-2 flex-shrink-0" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
                className="w-full bg-transparent text-xs text-text-primary font-medium focus:outline-none placeholder:text-text-muted/60"
              />
            </div>
          </div>

          <Button type="submit" size="lg" fullWidth disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account & Join VIP Club'}
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-surface-border">
          <p className="text-xs text-text-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted 256-Bit Identity Security</span>
        </div>
      </div>
    </div>
  );
}
