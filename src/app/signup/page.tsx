'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { registerAction, verifySignupOtpAction, resendSignupOtpAction } from '@/modules/auth/actions';
import { ShieldCheck, User, Mail, Phone, Lock, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

function SignUpFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect') || '/account';

  // Step 1 Form state
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 OTP state (4-digit)
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Handle Form Submission (Step 1)
  const handleFormSubmit = async (e: React.FormEvent) => {
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

      setLoading(false);
      setStep('otp');
      setResendCooldown(60);
      setSuccessMsg('A 4-digit verification code has been sent to your email.');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  // Handle 4-Digit OTP Input
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError(null);

    // Auto focus next box
    if (digit && index < 3) {
      otpInputs.current[index + 1]?.focus();
    }

    // Auto submit if all 4 digits entered
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

  // Verify 4-Digit OTP Submission
  const handleOtpVerify = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otp.join('');
    if (fullCode.length !== 4) {
      setError('Please enter the complete 4-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifySignupOtpAction(email.trim(), fullCode);
      if (!res.ok) {
        setError(res.error.message);
        setLoading(false);
        return;
      }

      setSuccessMsg('Account verified successfully! Welcome to MUVERA.');
      setTimeout(() => {
        router.push(callbackUrl);
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
      setLoading(false);
    }
  };

  // Resend 4-Digit OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await resendSignupOtpAction(email.trim());
      if (!res.ok) {
        setError(res.error.message);
      } else {
        setSuccessMsg('A fresh 4-digit verification code has been sent to your email.');
        setResendCooldown(60);
        setOtp(['', '', '', '']);
        otpInputs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code.');
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
            {step === 'form' ? 'Create Your Account' : 'Verify Your Email'}
          </h1>
          <p className="text-xs text-text-muted">
            {step === 'form'
              ? 'Unlock express streetwear drops, VIP access & instant WhatsApp checkout'
              : `We sent a 4-digit verification code to ${email}`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Registration Form */}
        {step === 'form' ? (
          <form onSubmit={handleFormSubmit} className="space-y-4">
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
              {loading ? 'Creating Account & Sending OTP...' : 'Create Account & Verify Email'}
            </Button>
          </form>
        ) : (
          /* STEP 2: 4-Digit OTP PIN Verification */
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-bold text-text-muted block text-center uppercase tracking-wider">
                Enter 4-Digit Code
              </label>

              {/* 4 Dedicated Digit Boxes */}
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
                Valid for 10 minutes. Code sent to <strong className="text-text-primary">{email}</strong>
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              fullWidth
              disabled={loading || otp.join('').length !== 4}
              onClick={() => handleOtpVerify()}
            >
              {loading ? 'Verifying...' : 'Verify & Enter MUVERA'}
            </Button>

            {/* Resend and Edit Actions */}
            <div className="flex flex-col items-center gap-3 pt-2 border-t border-surface-border text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">Didn&apos;t receive the code?</span>
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
                  setStep('form');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-text-muted hover:text-text-primary text-xs inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Edit details or change email
              </button>
            </div>
          </div>
        )}

        <div className="text-center pt-2 border-t border-surface-border">
          <p className="text-xs text-text-muted">
            Already have a verified account?{' '}
            <Link href={`/login${callbackUrl !== '/account' ? `?redirect=${encodeURIComponent(callbackUrl)}` : ''}`} className="font-bold text-primary hover:underline">
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

export default function CustomerSignUpPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto py-20 text-center text-text-muted">Loading sign up...</div>}>
      <SignUpFormContent />
    </Suspense>
  );
}
