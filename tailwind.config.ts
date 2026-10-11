import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          base: 'var(--color-surface-base)',
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          card: 'var(--color-surface-card)',
          bright: 'var(--color-surface-bright)',
          border: 'var(--color-surface-border)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          container: 'var(--color-primary-container)',
          foreground: 'var(--color-on-primary)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          container: 'var(--color-secondary-container)',
          foreground: '#FFFFFF',
        },
        tertiary: {
          DEFAULT: 'var(--color-tertiary)',
          foreground: 'var(--color-on-primary)',
        },
        muted: {
          DEFAULT: 'var(--color-surface-raised)',
          foreground: 'var(--color-text-muted)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          muted: 'var(--color-text-muted)',
          surface: 'var(--color-on-surface)',
          variant: 'var(--color-on-surface-variant)',
        },
      },
      fontFamily: {
        headline: ['var(--font-outfit)', 'Outfit', 'sans-serif'],
        body: ['var(--font-plus-jakarta-sans)', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': 'var(--shadow-primary-glow)',
        'crimson-glow': 'var(--shadow-crimson-glow)',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
