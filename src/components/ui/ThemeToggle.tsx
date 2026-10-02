'use client';

import React from 'react';
import { useTheme } from '@/lib/theme-context';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`flex items-center gap-2 p-2 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface-bright text-text-muted hover:text-text-primary transition-all duration-200 group ${className}`}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-primary group-hover:rotate-45 transition-transform duration-300" />
        ) : (
          <Moon className="w-4 h-4 text-amber-500 group-hover:-rotate-12 transition-transform duration-300" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-bold capitalize">
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
