import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-bold tracking-tight rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-primary text-surface-base hover:bg-primary-hover shadow-[0_4px_16px_rgba(250,204,21,0.25)] hover:shadow-gold-glow',
    secondary:
      'bg-secondary text-white hover:bg-secondary-hover shadow-[0_4px_16px_rgba(186,20,26,0.25)]',
    outline:
      'border border-surface-border text-text-primary hover:text-text-primary hover:border-primary/40 bg-surface-raised/60 hover:bg-surface-raised',
    ghost:
      'text-text-muted hover:text-text-primary hover:bg-surface-raised',
    danger:
      'bg-red-600/10 text-red-500 border border-red-500/30 hover:bg-red-600/20',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
