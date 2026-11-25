'use strict';

const { test, expect } = require('@playwright/test');

test.describe('Theme, Contrast & Accessibility E2E', () => {
  test('dark theme persists across all 3 pages, uses transparent dark logo plate, and keeps +N hover badge readable (UX-01)', async ({ page, isMobile }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Dark mode header logo uses transparent ground (crest intact + white wordmark) and aligns flush-left
    const plateBg = await page.locator('.kp-hdr .kp-plate').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(plateBg).toBe('rgba(0, 0, 0, 0)');

    // Persists across table.html and tree.html with aligned logo
    await page.goto('/table.html');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const tablePlateBg = await page.locator('.kp-hdr .kp-plate').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(tablePlateBg).toBe('rgba(0, 0, 0, 0)');

    await page.goto('/tree.html?member=0');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const treePlateBg = await page.locator('.kp-hdr .kp-plate').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(treePlateBg).toBe('rgba(0, 0, 0, 0)');

    if (!isMobile) {
      // UX-01: +N pill and text have distinct high-contrast fills at rest AND on hover in dark mode
      const truncatedNode = page.locator('#canvas svg .node:has(.more:not(:empty))').first();
      await expect(truncatedNode).toBeVisible();
      const restColors = await truncatedNode.evaluate(el => ({
        pill: getComputedStyle(el.querySelector('.more-pill')).fill,
        text: getComputedStyle(el.querySelector('.more')).fill,
      }));
      expect(restColors.pill).not.toBe(restColors.text);

      await truncatedNode.hover();
      await page.waitForTimeout(200);
      const hoverColors = await truncatedNode.evaluate(el => ({
        pill: getComputedStyle(el.querySelector('.more-pill')).fill,
        text: getComputedStyle(el.querySelector('.more')).fill,
      }));
      expect(hoverColors.pill).not.toBe(hoverColors.text);
    }
  });

  test('skip link is first in tab order and jumps to main content', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard Tab flow');
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.kp-skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('no horizontal page overflow on index.html, table.html, and tree.html', async ({ page }) => {
    for (const url of ['/', '/table.html', '/tree.html']) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `Horizontal overflow on ${url}`).toBeLessThanOrEqual(1);
    }
  });
});
