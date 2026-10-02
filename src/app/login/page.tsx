'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { loginAction, loginWithOtpAction } from '@/modules/auth/actions';
import { ShieldCheck, Mail, Lock, Phone, ArrowRight, Zap, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/account';
  const errorParam = searchParams.get('error');
  const messageParam = searchParams.get('message');

  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam === 'admin_required') {
      setErrorMessage('🔒 Administrative privileges required. Please sign in with an executive administrator account to access the Admin Portal.');
    }
    if (messageParam === 'password_reset_success') {
      setInfoMessage('✓ Password reset successfully! Please sign in with your new password.');
    }
  }, [errorParam, messageParam]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await loginAction({ email, password });
      if (!res.ok) {
        setErrorMessage(res.error.message);
        setLoading(false);
        return;
      }

      // If user is admin and callback was admin or default, redirect to admin
      if (res.data.role === 'admin') {
        router.push(callbackUrl.startsWith('/admin') ? callbackUrl : '/admin');
      } else {
        router.push(callbackUrl.startsWith('/admin') ? '/account' : callbackUrl);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
    }, 500);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await loginWithOtpAction(phone, otp);
      if (!res.ok) {
        setErrorMessage(res.error.message);
        setLoading(false);
        return;
      }

      if (res.data.role === 'admin') {
        router.push(callbackUrl.startsWith('/admin') ? callbackUrl : '/admin');
      } else {
        router.push(callbackUrl.startsWith('/admin') ? '/account' : callbackUrl);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed. Try again.');
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setMode('password');
    setEmail('admin@muvera.club');
    setPassword('AdminPassword2026!');
    setErrorMessage(null);
  };

  const fillDemoCustomer = () => {
    setMode('password');
    setEmail('customer@muvera.club');
    setPassword('CustomerPassword2026!');
    setErrorMessage(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="p-8 rounded-3xl bg-surface-card border border-surface-border shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-headline text-3xl font-black tracking-wider text-primary">MUVERA</span>
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-surface-raised text-text-muted border border-surface-border">
              Secure Auth
            </span>
          </div>
          <h1 className="font-headline font-bold text-xl text-text-primary">Sign In to MUVERA</h1>
          <p className="text-xs text-text-muted">
            Access VIP drops, express tracking &amp; inventory operations
          </p>
        </div>

        {/* Success or Informational Banner */}
        {infoMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Security or Access Denied Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="flex p-1 rounded-xl bg-surface-raised border border-surface-border">
          <button
            type="button"
            onClick={() => {
              setMode('password');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'password'
                ? 'bg-surface-card text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Email &amp; Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('otp');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'otp'
                ? 'bg-surface-card text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            WhatsApp OTP
          </button>
        </div>

        {/* Password Login Mode */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-text-muted mb-1 block">Email Address *</label>
              <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
                <Mail className="w-4 h-4 text-text-muted mr-2 flex-shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@muvera.club or customer@muvera.club"
                  className="w-full bg-transparent text-xs text-text-primary font-medium focus:outline-none placeholder:text-text-muted/60"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-text-muted">Password *</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-primary hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
                <Lock className="w-4 h-4 text-text-muted mr-2 flex-shrink-0" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-transparent text-xs text-text-primary font-medium focus:outline-none placeholder:text-text-muted/60"
                />
              </div>
            </div>

            <Button type="submit" size="lg" fullWidth disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
        )}

        {/* WhatsApp OTP Mode */}
        {mode === 'otp' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">Mobile Number *</label>
                  <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
                    <span className="text-xs font-bold text-primary mr-2 pr-2 border-r border-surface-border">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="98765 43210"
                      className="w-full bg-transparent text-xs text-text-primary font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" fullWidth disabled={loading || phone.length < 10}>
                  {loading ? 'Sending OTP...' : 'Send WhatsApp OTP Code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-text-muted">Enter 4-Digit OTP</label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-primary underline font-bold"
                    >
                      Change Number
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl p-3 text-center text-xl font-mono font-black text-primary tracking-widest focus:outline-none"
                  />
                  <p className="text-[11px] text-text-muted text-center mt-1">
                    Demo OTP code: enter 1234 or any 4 digits
                  </p>
                </div>

                <Button type="submit" size="lg" fullWidth disabled={loading || otp.length < 4}>
                  {loading ? 'Verifying...' : 'Verify OTP & Sign In'}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* 1-Click Demo Login Shortcuts */}
        <div className="p-3.5 rounded-2xl bg-surface-raised/70 border border-surface-border space-y-2">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>1-Click Test Credentials</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-[11px] font-black text-primary text-center transition-colors"
            >
              👑 Fill Admin
            </button>
            <button
              type="button"
              onClick={fillDemoCustomer}
              className="p-2 rounded-xl bg-surface-card hover:bg-surface-bright border border-surface-border text-[11px] font-bold text-text-primary text-center transition-colors"
            >
              🛍️ Fill Customer
            </button>
          </div>
        </div>

        {/* Links to Register */}
        <div className="text-center pt-2 border-t border-surface-border">
          <p className="text-xs text-text-muted">
            New to MUVERA?{' '}
            <Link href="/signup" className="font-bold text-primary hover:underline">
              Create an Account
            </Link>
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Role-Based 256-Bit Authentication</span>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto py-20 text-center text-text-muted">Loading sign in...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
