# MUVERA Responsive System Audit Matrix

## 1. Overview & Objectives
This audit verifies that the MUVERA storefront and administrative portals are fully fluid and responsive across device viewports ranging from **320px** (small mobile) to **3440px** (ultrawide monitors), under dynamic window resizing, orientation changes, and 200% browser zoom scaling.

All fixed pixel sizing in page templates (`w-[...px]`, `h-[...px]`) has been eliminated and replaced with:
- Fluid Viewport Units (`vw`, `vh`, `dvh`, `svh`, `cqw`)
- CSS Math Functions (`clamp()`, `min()`, `max()`)
- Reusable Layout Primitives (`src/components/layout/`)
- Enforced CI verification via `npm run check:layout`

---

## 2. Device & Viewport Verification Matrix

| Viewport Category | Resolution (W x H) | Orientation | Zero Sideways Scroll (`scrollWidth <= clientWidth`) | Fluid Reflow | Touch Target $\ge 44\text{px}$ | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Small Phone** | 320 x 568 | Portrait | PASS | PASS | PASS | Verified |
| **Standard Phone** | 360 x 640 | Portrait | PASS | PASS | PASS | Verified |
| **iPhone SE** | 375 x 667 | Portrait | PASS | PASS | PASS | Verified |
| **iPhone 14/15** | 390 x 844 | Portrait | PASS | PASS | PASS | Verified |
| **Android Flagship** | 412 x 915 | Portrait | PASS | PASS | PASS | Verified |
| **iPhone Pro Max** | 430 x 932 | Portrait | PASS | PASS | PASS | Verified |
| **Phone Landscape** | 844 x 390 | Landscape | PASS | PASS | PASS | Verified |
| **iPad Portrait** | 768 x 1024 | Portrait | PASS | PASS | PASS | Verified |
| **iPad Air / Pro** | 820 x 1180 | Portrait | PASS | PASS | PASS | Verified |
| **iPad Landscape** | 1024 x 768 | Landscape | PASS | PASS | PASS | Verified |
| **Small Laptop** | 1280 x 720 | Landscape | PASS | PASS | PASS | Verified |
| **Standard Laptop** | 1440 x 900 | Landscape | PASS | PASS | PASS | Verified |
| **Full HD Desktop** | 1920 x 1080 | Landscape | PASS | PASS | PASS | Verified |
| **QHD 2K Desktop** | 2560 x 1440 | Landscape | PASS | PASS | PASS | Verified |
| **Ultrawide 4K** | 3440 x 1440 | Landscape | PASS | PASS | PASS | Verified |
| **Continuous Sweep**| 320px &rarr; 3440px | Dynamic Resize | PASS | PASS | PASS | Verified |
| **200% Browser Zoom**| 720px effective | Scaled | PASS | PASS | PASS | Verified |

---

## 3. Component & Primitive Inventory

| Primitive | Path | Primary Purpose | Responsive Behavior |
| :--- | :--- | :--- | :--- |
| `Container` | `src/components/layout/Container.tsx` | Centered wrapper | Fluid `clamp(1rem, 3.5vw, 2.5rem)` insets, `max-w-7xl` |
| `Stack` | `src/components/layout/Stack.tsx` | Vertical flex column | Token fluid gaps, `min-w-0` to prevent text blowout |
| `Row` | `src/components/layout/Row.tsx` | Flex cluster | Wrap support, fluid gap scales |
| `Grid` | `src/components/layout/Grid.tsx` | Intrinsic CSS Grid | `repeat(auto-fit, minmax(min(100%, minWidth), 1fr))` |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | 2-pane collapsing layout | Flex-basis clamp collapsing intrinsically below threshold |
| `Switcher` | `src/components/layout/Switcher.tsx` | Horizontal-to-vertical reflow | Reflows below configured threshold width |
| `Frame` | `src/components/layout/Frame.tsx` | Aspect-ratio container | Maintains 1/1, 4/5, 16/9 without CLS (< 0.1) |
| `ScrollArea` | `src/components/layout/ScrollArea.tsx` | Designated overflow zone | Controlled horizontal scroll for rails & tables |
| `ResponsiveTable` | `src/components/layout/ResponsiveTable.tsx` | Dual-mode table | Full table on desktop, accessible cards on mobile |
| `Sheet` | `src/components/layout/Sheet.tsx` | Adaptive sheet/modal | `90dvh` bottom sheet on mobile &rarr; centered dialog on desktop |

---

## 4. Key Decisions & Resolved Layout Edge Cases
1. **Zero Sideways Scroll**:
   - Replaced fixed widths and `w-screen` with `w-full` and `min(100%, ...)`.
   - Guaranteed table and chip rail horizontal scrollbars stay isolated inside `ScrollArea`.
2. **UPI QR Code on Mobile Checkout**:
   - Replaced rigid `w-[200px] h-[200px]` with fluid responsive box `w-[min(70vw,14rem)] h-[min(70vw,14rem)]` with `object-contain`.
3. **Hero Banner & Dynamic Chrome**:
   - Switched from rigid pixel heights (`h-[440px]`) to `min-h-[clamp(26rem, 65dvh, 34rem)]`, adapting gracefully to mobile browser address bar collapse and expand.
4. **iOS Form Input Auto-Zoom**:
   - Enforced `font-size: 1rem` (`16px`) minimum across all mobile form controls via `src/app/globals.css`.
5. **Touch Targets**:
   - Added `.touch-target` with `min-inline-size: 2.75rem` and `min-block-size: 2.75rem` ($\ge 44\text{px}$).

---

## 5. Automated CI Validation
Run the zero-fixed-pixel validation suite:
```bash
npm run check:layout
```
Result:
```
🔍 [CI] Scanning codebase for hardcoded pixel dimensions (w-[...px], h-[...px])...
📁 Scanned 39 component & route templates.
✅ Passed: Zero hardcoded pixel layout declarations found!
```
