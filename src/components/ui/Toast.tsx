'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '@/lib/toast-context';

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

export function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />,
  };

  const borders = {
    success: 'border-emerald-500/30',
    error: 'border-red-500/30',
    warning: 'border-amber-500/30',
    info: 'border-primary/30',
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-surface-card/95 backdrop-blur-xl border ${borders[toast.type]} shadow-2xl text-xs text-text-primary transition-all duration-300 animate-in slide-in-from-top-2 fade-in`}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0 pr-1">
        {toast.title && <p className="font-headline font-bold text-xs text-text-primary mb-0.5">{toast.title}</p>}
        <p className="text-text-primary leading-relaxed font-medium">{toast.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
