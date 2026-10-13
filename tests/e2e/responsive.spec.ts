import { test, expect } from '@playwright/test';

/**
 * Responsive Viewport & Fluid Layout E2E Test Suite
 * Matrix covers small phones to ultrawide desktops, 200% zoom,
 * touch targets >= 44px, mobile input sizes >= 16px, and zero horizontal document overflow.
 */

const VIEWPORT_MATRIX = [
  { name: 'Small Phone Portrait', width: 320, height: 568 },
  { name: 'Standard Phone Portrait', width: 375, height: 667 },
  { name: 'Modern Phone Portrait', width: 390, height: 844 },
  { name: 'Large Phone Portrait', width: 430, height: 932 },
  { name: 'Phone Landscape', width: 844, height: 390 },
  { name: 'Tablet Portrait', width: 768, height: 1024 },
  { name: 'Tablet Landscape', width: 1024, height: 768 },
  { name: 'Small Laptop', width: 1280, height: 720 },
  { name: 'Standard Laptop', width: 1440, height: 900 },
  { name: 'Desktop Full HD', width: 1920, height: 1080 },
  { name: 'QHD Desktop', width: 2560, height: 1440 },
  { name: 'Ultrawide Monitor', width: 3440, height: 1440 },
];

const TARGET_ROUTES = [
  '/',
  '/products',
  '/categories',
  '/search',
  '/cart',
  '/checkout',
  '/wishlist',
  '/dev/layout',
];

test.describe('Responsive Layout Verification', () => {
  for (const vp of VIEWPORT_MATRIX) {
    test(`No horizontal scroll at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of TARGET_ROUTES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });

        // Zero horizontal document overflow check
        const isOverflowing = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(isOverflowing, `Route ${route} should not have horizontal document overflow at ${vp.width}px`).toBeFalsy();
      }
    });
  }

  test('Interactive touch targets on mobile meet 44px standard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dev/layout');

    const touchButtons = page.locator('.touch-target');
    const count = await touchButtons.count();

    for (let i = 0; i < count; i++) {
      const box = await touchButtons.nth(i).boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('Mobile inputs prevent auto-zoom (font-size >= 16px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/checkout');

    const inputs = page.locator('input[type="text"], input[type="tel"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const fontSize = await inputs.nth(i).evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });
      const numericSize = parseFloat(fontSize);
      expect(numericSize).toBeGreaterThanOrEqual(16);
    }
  });

  test('Page retains zero horizontal overflow under 200% zoom scaling', async ({ page }) => {
    // 200% zoom simulation on 1440px viewport gives 720px effective width
    await page.setViewportSize({ width: 720, height: 900 });
    await page.goto('/');

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(isOverflowing).toBeFalsy();
  });
});
