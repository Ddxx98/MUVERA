import React from 'react';

interface BadgeProps {
  variant?: 'express' | 'blitz' | 'discount' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase whitespace-nowrap leading-none';

  const variants = {
    express: 'bg-primary/20 text-primary border border-primary/40',
    blitz: 'bg-secondary text-white shadow-sm animate-pulse',
    discount: 'bg-secondary text-white font-extrabold',
    'in-stock': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    'low-stock': 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse',
    'out-of-stock': 'bg-surface-raised text-text-muted border border-surface-border line-through',
    neutral: 'bg-surface-card text-text-muted border border-surface-border',
  };

  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
}
