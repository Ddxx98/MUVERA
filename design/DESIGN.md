# Midnight Quick-Glam — MUVERA Design System Specification

> Extracted directly from Stitch Project: `projects/11537620980849831602`
> Project Name: Slikk Club UI Clone / MUVERA
> Color Mode: DARK | Headline Font: Outfit | Body Font: Plus Jakarta Sans

---

## 1. Brand & Aesthetic Vision

This design system is engineered for **MUVERA**, an ultra-fast 60-minute luxury fashion & streetwear commerce experience. 
The aesthetic is **High-Contrast Dark Mode Glamour**: deep void blacks (`#0E0E10`) and charcoal tonal layering (`#18181B`, `#23232A`) paired with luminous electric gold (`#FACC15`) CTAs, marquee gold accents (`#F59E0B`), and festive crimson countdown ribbons (`#BA141A`).

---

## 2. Token Specification

### 2.1 Color Tokens

```css
:root {
  /* Canvas & Base Surfaces */
  --color-surface-base: #0E0E10;
  --color-surface: #131315;
  --color-surface-raised: #18181B;
  --color-surface-card: #23232A;
  --color-surface-bright: #39393B;
  --color-surface-border: #2E2E38;
  
  /* Brand Accents */
  --color-primary: #FACC15;              /* Electric Gold - Main CTAs, Active States */
  --color-primary-container: #FACC15;
  --color-on-primary: #0E0E10;
  --color-secondary: #BA141A;            /* Festive Crimson - Urgency badges, tickers */
  --color-secondary-container: #A90010;
  --color-tertiary: #F59E0B;             /* Marquee Gold - VIP club, borders */
  
  /* Text & Typography Colors */
  --color-text-primary: #FFFFFF;
  --color-text-muted: #A1A1AA;
  --color-on-surface: #E5E1E4;
  --color-on-surface-variant: #D1C6AB;
  
  /* Utilities & Underglows */
  --glow-primary: 0 8px 24px rgba(250, 204, 21, 0.22);
  --glow-crimson: 0 8px 24px rgba(186, 20, 26, 0.30);
  --border-ghost: 1px solid #2E2E38;
}
```

### 2.2 Typography Scale

- **Headline Font**: `Outfit`, sans-serif (800 / 700 / 600 weight)
- **Body & Label Font**: `Plus Jakarta Sans`, sans-serif (400 / 500 / 700 / 800 weight)

| Token Key | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `headline-xl` | Outfit | 36px (Desktop) / 28px (Mobile) | 800 | 40px / 32px | -0.02em |
| `headline-lg` | Outfit | 24px | 700 | 28px | -0.01em |
| `headline-md` | Outfit | 20px | 700 | 24px | 0 |
| `headline-sm` | Outfit | 16px | 700 | 20px | 0 |
| `body-lg` | Plus Jakarta Sans | 16px | 400 | 24px | 0 |
| `body-md` | Plus Jakarta Sans | 14px | 400 | 20px | 0 |
| `body-sm` | Plus Jakarta Sans | 12px | 500 | 16px | 0 |
| `label-lg` | Plus Jakarta Sans | 14px | 700 | 16px | 0.02em |
| `label-md` | Plus Jakarta Sans | 12px | 700 | 14px | 0.04em |
| `label-sm` | Plus Jakarta Sans | 10px | 800 | 12px | 0.06em |

### 2.3 Radii & Elevation Rules

- **Base Containers & Inputs**: `8px` (`0.5rem`)
- **Product & Category Cards**: `12px` to `16px` (`0.75rem` - `1rem`)
- **Interactive Badges, Filter Chips & Primary Buttons**: `rounded-full` (`9999px`)
- **Depth mechanism**: Surface Luminance Stacking (`#0E0E10` -> `#18181B` -> `#23232A`) + Ghost Borders (`#2E2E38`) + Primary Neon Underglow (`0 8px 24px rgba(250, 204, 21, 0.22)`).

---

## 3. Stitch Component Primitives Mapping

1. **Primary Button**: Solid Electric Gold (`#FACC15`), dark text (`#0E0E10`), pill-shaped (`rounded-full`), hover/active elevation with gold glow.
2. **Delivery ETA Badge**: Pill badge with electric yellow/neon green indicator ("⚡ 60-MIN EXPRESS").
3. **Discount Tag**: Crimson tag (`#BA141A`) with bold white text overlaying product top-left frame.
4. **Product Card**: 12px radius, portrait 3:4 aspect ratio image, charcoal baseline card (`#23232A`), brand name, bold price in integer paise display, slashed MRP, discount badge.
5. **Search Bar**: Pill-shaped dark input (`#18181B`), ghost border (`#2E2E38`), integrated voice icon, and dedicated gold submit action button.
