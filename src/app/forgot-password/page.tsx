'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { requestPasswordResetAction, resetPasswordWithOtpAction } from '@/modules/auth/actions';
import { Mail, ArrowLeft, CheckCircle2, ShieldAlert, Sparkles, KeyRound, Lock, ArrowRight, RotateCw } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Multi-step: 'request_otp' -> 'verify_otp' -> 'success'
  const [step, setStep] = useState<'request_otp' | 'verify_otp' | 'success'>('request_otp');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer countdown for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1: Send OTP to email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await requestPasswordResetAction(email);
      if (!res.ok) {
        setErrorMessage(res.error.message);
        setLoading(false);
        return;
      }

      setStep('verify_otp');
      setResendCooldown(45);
      setLoading(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and reset password
  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, '');

    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await resetPasswordWithOtpAction(email, cleanOtp, newPassword);
      if (!res.ok) {
        setErrorMessage(res.error.message);
        setLoading(false);
        return;
      }

      setStep('success');
      setLoading(false);

      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?message=password_reset_success');
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed. Please try again.');
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await requestPasswordResetAction(email);
      if (!res.ok) {
        setErrorMessage(res.error.message);
      } else {
        setResendCooldown(45);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoEmail = (target: string) => {
    setEmail(target);
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
              Security
            </span>
          </div>
          <h1 className="font-headline font-bold text-xl text-text-primary">
            {step === 'request_otp' && 'Password Recovery'}
            {step === 'verify_otp' && 'Enter Verification OTP'}
            {step === 'success' && 'Password Reset Complete'}
          </h1>
          <p className="text-xs text-text-muted">
            {step === 'request_otp' && 'Enter your account email to receive a 6-digit verification code.'}
            {step === 'verify_otp' && (
              <span>
                Enter the 6-digit code sent to <strong className="text-text-primary">{email}</strong>
              </span>
            )}
            {step === 'success' && 'Your credentials have been securely updated.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Request OTP Form */}
        {step === 'request_otp' && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-text-muted mb-1 block">Account Email *</label>
              <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
                <Mail className="w-4 h-4 text-text-muted mr-2 flex-shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. yourname@domain.com"
                  className="w-full bg-transparent text-xs text-text-primary font-medium focus:outline-none placeholder:text-text-muted/60"
                />
              </div>
            </div>

            <Button type="submit" size="lg" fullWidth disabled={loading}>
              {loading ? 'Dispatching 6-Digit OTP...' : 'Send Verification OTP'}
            </Button>

            {/* Quick Demo Helpers */}
            <div className="pt-2 border-t border-surface-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Quick Demo Accounts
                </span>
                <span className="text-[10px] text-text-muted font-mono">1-Click Fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoEmail('customer@muvera.club')}
                  className="text-left px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-border/40 border border-surface-border text-[11px] transition-colors"
                >
                  <div className="font-bold text-text-primary flex items-center gap-1">🛍️ Customer</div>
                  <div className="text-[10px] text-text-muted truncate">customer@muvera.club</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoEmail('admin@muvera.club')}
                  className="text-left px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-border/40 border border-surface-border text-[11px] transition-colors"
                >
                  <div className="font-bold text-primary flex items-center gap-1">👑 Admin</div>
                  <div className="text-[10px] text-text-muted truncate">admin@muvera.club</div>
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs text-text-muted hover:text-text-primary font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Verify OTP & Reset Password */}
        {step === 'verify_otp' && (
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-text-muted">6-Digit Verification Code *</label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[11px] text-primary hover:underline font-bold disabled:text-text-muted disabled:no-underline flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
                </button>
              </div>
              <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
                <KeyRound className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-transparent text-sm text-text-primary font-mono font-bold tracking-widest focus:outline-none placeholder:text-text-muted/40"
                />
              </div>
              <p className="text-[10px] text-text-muted mt-1">Check your inbox for the 6-digit code (valid for 15 minutes).</p>
            </div>

            <div>
              <label className="text-xs font-bold text-text-muted mb-1 block">New Password *</label>
              <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
                <Lock className="w-4 h-4 text-text-muted mr-2 flex-shrink-0" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-transparent text-xs text-text-primary font-medium focus:outline-none placeholder:text-text-muted/60"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-muted mb-1 block">Confirm New Password *</label>
              <div className="flex items-center bg-surface-raised border border-surface-border focus-within:border-primary rounded-xl px-3.5 py-2.5">
                <Lock className="w-4 h-4 text-text-muted mr-2 flex-shrink-0" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-transparent text-xs text-text-primary font-medium focus:outline-none placeholder:text-text-muted/60"
                />
              </div>
            </div>

            <Button type="submit" size="lg" fullWidth disabled={loading}>
              {loading ? 'Verifying & Updating...' : 'Reset Password & Sign In'}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep('request_otp')}
                className="text-xs text-text-muted hover:text-text-primary font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change Email Address
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success State */}
        {step === 'success' && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-headline font-bold text-lg text-text-primary">Password Reset Successful!</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                Your credentials have been updated securely. Redirecting you to sign in...
              </p>
            </div>

            <div className="pt-2">
              <Link href="/login" className="block">
                <Button size="lg" fullWidth>
                  Sign In Now <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Developer Environment Indicator */}
      <div className="p-3.5 rounded-2xl bg-surface-card border border-surface-border text-center text-[11px] text-text-muted leading-relaxed">
        <KeyRound className="w-3.5 h-3.5 text-primary inline mr-1" />
        <strong>Provider Note:</strong> Dispatched via EmailJS or Brevo when API keys are configured, or logged to console in local development.
      </div>
    </div>
  );
}
