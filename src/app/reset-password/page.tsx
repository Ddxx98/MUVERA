'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { validateResetTokenAction, resetPasswordAction } from '@/modules/auth/actions';
import { Lock, CheckCircle2, ShieldAlert, ArrowRight, KeyRound, Loader2, Sparkles } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [targetEmail, setTargetEmail] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkToken() {
      if (!token) {
        setChecking(false);
        setTokenValid(false);
        setErrorMessage('No reset token was provided. Please request a new password reset link.');
        return;
      }

      try {
        const res = await validateResetTokenAction(token);
        if (!mounted) return;

        if (res.ok && res.data.valid) {
          setTokenValid(true);
          setTargetEmail(res.data.email || null);
        } else {
          setTokenValid(false);
          setErrorMessage(res.ok ? res.data.message || 'Reset link is invalid or expired.' : res.error.message);
        }
      } catch {
        if (!mounted) return;
        setTokenValid(false);
        setErrorMessage('Failed to verify the reset token. Please request a new link.');
      } finally {
        if (mounted) setChecking(false);
      }
    }

    checkToken();

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await resetPasswordAction(token, password);
      if (!res.ok) {
        setErrorMessage(res.error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?message=password_reset_success');
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reset password. Please try again.');
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
          <h1 className="font-headline font-bold text-xl text-text-primary">Create New Password</h1>
          <p className="text-xs text-text-muted">
            {targetEmail ? (
              <span>
                Resetting credentials for <strong className="text-text-primary">{targetEmail}</strong>
              </span>
            ) : (
              'Enter and confirm your new password below.'
            )}
          </p>
        </div>

        {/* Loading Token Check */}
        {checking && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-xs text-text-muted font-medium">Validating cryptographic security token...</p>
          </div>
        )}

        {/* Error Alert */}
        {!checking && errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Invalid Token State */}
        {!checking && !tokenValid && !success && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
              <KeyRound className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-headline font-bold text-lg text-text-primary">Expired or Invalid Link</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                Security tokens are single-use and automatically expire after 30 minutes. Please request a fresh reset link to proceed.
              </p>
            </div>

            <div className="pt-2">
              <Link href="/forgot-password" className="block">
                <Button size="lg" fullWidth>
                  Request New Reset Link
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Success State */}
        {!checking && success && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-headline font-bold text-lg text-text-primary">Password Reset Complete!</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                Your password has been securely updated and existing sessions have been signed out. Redirecting you to sign in...
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

        {/* Active Reset Form */}
        {!checking && tokenValid && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-text-muted mb-1 block">New Password *</label>
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
              {loading ? 'Updating Credentials...' : 'Reset Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-20 text-center text-xs text-text-muted">
          Loading security verification...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
