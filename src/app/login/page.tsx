'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { loginAction, verifySignupOtpAction, resendSignupOtpAction } from '@/modules/auth/actions';
import { ShieldCheck, Mail, Lock, ShieldAlert, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/account';
  const errorParam = searchParams.get('error');
  const messageParam = searchParams.get('message');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Unverified account inline OTP verification state
  const [needsEmailVerify, setNeedsEmailVerify] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (errorParam === 'admin_required') {
      setErrorMessage('🔒 Administrative privileges required. Please sign in with an executive administrator account to access the Admin Portal.');
    }
    if (messageParam === 'password_reset_success') {
      setInfoMessage('✓ Password reset successfully! Please sign in with your new password.');
    }
  }, [errorParam, messageParam]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (needsEmailVerify && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [needsEmailVerify, resendCooldown]);

  // Focus first OTP box when entering OTP state
  useEffect(() => {
    if (needsEmailVerify) {
      setTimeout(() => {
        otpInputs.current[0]?.focus();
      }, 100);
    }
  }, [needsEmailVerify]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await loginAction({ email, password });
      if (!res.ok) {
        if (res.error.code === 'EMAIL_NOT_VERIFIED') {
          setVerifyEmail(email.trim());
          setNeedsEmailVerify(true);
          setResendCooldown(60);
          setInfoMessage('A 4-digit verification code has been sent to your email. Enter it below to activate your account.');
          setLoading(false);
          return;
        }

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

  // OTP Handlers for Unverified Accounts
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setErrorMessage(null);

    if (digit && index < 3) {
      otpInputs.current[index + 1]?.focus();
    }

    if (digit && index === 3 && newOtp.every((d) => d.length === 1)) {
      handleOtpVerify(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pastedData) return;

    const newOtp = ['', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    if (pastedData.length === 4) {
      otpInputs.current[3]?.focus();
      handleOtpVerify(pastedData);
    } else {
      otpInputs.current[pastedData.length]?.focus();
    }
  };

  const handleOtpVerify = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otp.join('');
    if (fullCode.length !== 4) {
      setErrorMessage('Please enter the complete 4-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifySignupOtpAction(verifyEmail, fullCode);
      if (!res.ok) {
        setErrorMessage(res.error.message);
        setLoading(false);
        return;
      }

      setInfoMessage('Email verified successfully! Signing in...');
      setTimeout(() => {
        if (res.data.role === 'admin') {
          router.push(callbackUrl.startsWith('/admin') ? callbackUrl : '/admin');
        } else {
          router.push(callbackUrl.startsWith('/admin') ? '/account' : callbackUrl);
        }
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed. Try again.');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage(null);

    try {
      const res = await resendSignupOtpAction(verifyEmail);
      if (!res.ok) {
        setErrorMessage(res.error.message);
      } else {
        setInfoMessage('A fresh 4-digit code has been sent to your email.');
        setResendCooldown(60);
        setOtp(['', '', '', '']);
        otpInputs.current[0]?.focus();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend code.');
    } finally {
      setResending(false);
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
          <h1 className="font-headline font-bold text-xl text-text-primary">
            {needsEmailVerify ? 'Verify Email Address' : 'Sign In to Your Account'}
          </h1>
          <p className="text-xs text-text-muted">
            {needsEmailVerify
              ? `Enter the 4-digit code sent to ${verifyEmail}`
              : 'Access VIP drops, express tracking & inventory operations'}
          </p>
        </div>

        {/* Success or Informational Banner */}
        {infoMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Normal Login Form */}
        {!needsEmailVerify ? (
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
                  placeholder="name@example.com"
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
        ) : (
          /* Unverified User 4-Digit Verification View */
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-bold text-text-muted block text-center uppercase tracking-wider">
                Enter 4-Digit Code
              </label>

              <div className="flex justify-center gap-3 sm:gap-4" onPaste={handleOtpPaste}>
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[idx]}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-14 h-16 sm:w-16 sm:h-20 text-center font-mono text-3xl font-black bg-surface-raised border-2 border-surface-border focus:border-primary focus:bg-surface-card rounded-2xl text-primary transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ))}
              </div>
              <p className="text-[11px] text-text-muted text-center">
                Valid for 10 minutes. Code sent to <strong className="text-text-primary">{verifyEmail}</strong>
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              fullWidth
              disabled={loading || otp.join('').length !== 4}
              onClick={() => handleOtpVerify()}
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </Button>

            <div className="flex flex-col items-center gap-3 pt-2 border-t border-surface-border text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">Didn&apos;t receive code?</span>
                {resendCooldown > 0 ? (
                  <span className="text-primary font-mono font-bold">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="text-primary font-bold hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                    Resend Code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setNeedsEmailVerify(false);
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="text-text-muted hover:text-text-primary text-xs inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          </div>
        )}

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
