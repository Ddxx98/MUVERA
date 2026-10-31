'use client';

import { useState, useEffect, useRef } from 'react';

export interface CountdownOptions {
  expiresAt?: string | number | null;
  serverNow?: string | number | null;
  onExpire?: () => void;
}

export interface CountdownResult {
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isMounted: boolean;
  hasTarget: boolean;
}

/**
 * Hydration-safe countdown timer with server clock skew compensation and ref-safe onExpire callback.
 */
export function useCountdown({ expiresAt, serverNow, onExpire }: CountdownOptions): CountdownResult {
  const [mounted, setMounted] = useState(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const target = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const initialServer = serverNow ? new Date(serverNow).getTime() : NaN;
  const hasTarget = Number.isFinite(target);

  // Single-pass clock skew calculation: serverNow - Date.now()
  const [clockSkew, setClockSkew] = useState(() =>
    Number.isFinite(initialServer) ? initialServer - Date.now() : 0
  );

  useEffect(() => {
    if (Number.isFinite(initialServer)) {
      setClockSkew(initialServer - Date.now());
    }
  }, [initialServer]);

  const calculateRemaining = () => {
    if (!hasTarget) return 0;
    const nowWithSkew = Date.now() + clockSkew;
    return Math.max(0, target - nowWithSkew);
  };

  const [timeLeft, setTimeLeft] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (!hasTarget) return;

    const initial = calculateRemaining();
    setTimeLeft(initial);
    firedRef.current = false;

    if (initial <= 0 && !firedRef.current) {
      firedRef.current = true;
      onExpireRef.current?.();
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (!firedRef.current) {
          firedRef.current = true;
          onExpireRef.current?.();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [target, clockSkew, hasTarget]);

  // Pre-mount SSR guard: neutral state, isExpired is FALSE so UI does not flash "expired"
  if (!mounted || !hasTarget) {
    return {
      minutes: 0,
      seconds: 0,
      isExpired: false,
      isMounted: mounted,
      hasTarget,
    };
  }

  const totalSeconds = Math.floor(timeLeft / 1000);
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    isExpired: totalSeconds <= 0,
    isMounted: true,
    hasTarget: true,
  };
}
