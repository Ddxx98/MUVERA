import React, { useEffect } from 'react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Sheet: Adaptive drawer component.
 * - Mobile (< 768px): Bottom sheet using 90dvh max height with safe-area bottom padding.
 * - Desktop (>= 768px): Centered modal dialog with max-inline-size: min(90vw, 36rem).
 */
export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Surface */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full md:max-w-xl max-h-[90dvh] bg-surface-card border border-surface-border rounded-t-2xl md:rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all pb-safe ${className}`.trim()}
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-surface-border rounded-full mx-auto mt-3 mb-1 md:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border">
          {title ? (
            <h3 className="text-base font-semibold text-text-primary truncate">{title}</h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="touch-target text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0 text-sm text-text-muted">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-surface-border bg-surface-raised/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
