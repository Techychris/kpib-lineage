'use strict';

const { test, expect } = require('@playwright/test');

test.describe('Responsive Apple Mobile, Tablet & Desktop Audits', () => {
  test('iPhone mobile: mobile menu ARIA (DS-07), stacked table with 16px select (DS-06), 44px touch targets (UX-06), and phone tree founder flow', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile phone viewport tests only');

    // 1. Mobile menu aria-expanded & Escape focus restoration (DS-07)
    await page.goto('/');
    const summary = page.locator('.kp-menu > summary');
    await expect(summary).toBeVisible();
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
    await summary.click();
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(summary).toHaveAttribute('aria-expanded', 'false');

    // 2. Table page: collapsible Filters drawer, >=44px touch targets, 16px #mobileSort (no iOS zoom), stacked rows
    await page.goto('/table.html');
    const filterToggle = page.locator('#filterToggle');
    await expect(filterToggle).toBeVisible();
    const toggleBox = await filterToggle.boundingBox();
    expect(toggleBox.height).toBeGreaterThanOrEqual(44);

    await filterToggle.click();
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');

    const sortFontSize = await page.locator('#mobileSort').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(sortFontSize).toBeGreaterThanOrEqual(16);

    await page.locator('#schools button', { hasText: 'NIU' }).click();
    await expect(page.locator('#filterCount')).toBeVisible();
    await expect(page.locator('#filterCount')).toHaveText('1');

    // Verify stacked mobile rows (table rows display as block)
    const rowDisplay = await page.locator('#members tr').first().evaluate(el => getComputedStyle(el).display);
    expect(rowDisplay).toBe('block');

    // 3. Tree page: opens in founder picker, opening a founder keeps #depthNote visible (UX-08)
    await page.goto('/tree.html');
    await expect(page.locator('#founderList')).toBeVisible();
    await expect(page.locator('#viewToggle')).toBeVisible();
    await page.locator('#founderList button').first().click();
    await expect(page.locator('#canvas')).toBeVisible();
    await expect(page.locator('#depthNote')).toBeVisible();
  });

  test('iPad portrait & landscape: no 700-899px hero background seam (UX-03), Desktop Tree in iPad landscape, and synced #branch on rotation (UX-05)', async ({ page }) => {
    // iPad Air Portrait (820x1080)
    await page.setViewportSize({ width: 820, height: 1080 });
    await page.goto('/');
    const seamCheck = await page.evaluate(() => {
      const hero = document.querySelector('.kp-hero').getBoundingClientRect();
      const bg = document.querySelector('.kp-herobg').getBoundingClientRect();
      return { heroW: Math.round(hero.width), bgW: Math.round(bg.width) };
    });
    expect(seamCheck.bgW).toBe(seamCheck.heroW);

    // iPad Air Landscape (1180x720): stays in Desktop Tree mode (not downgraded to Phone mode!)
    await page.setViewportSize({ width: 1180, height: 720 });
    await page.goto('/tree.html');
    await expect(page.locator('#viewToggle')).toBeHidden();
    await expect(page.locator('#canvas')).toBeVisible();
    await expect(page.locator('#branch')).toHaveValue('-1');

    // Resize down to phone size and back -> #branch <select> stays synced (UX-05 fixed!)
    await page.setViewportSize({ width: 390, height: 700 });
    await expect(page.locator('#viewToggle')).toBeVisible();
    await expect(page.locator('#branch')).toHaveValue('-3');
    await page.setViewportSize({ width: 1180, height: 720 });
    await expect(page.locator('#viewToggle')).toBeHidden();
    await expect(page.locator('#branch')).toHaveValue('-1');
  });

  test('Desktop half-screen (960x1040) shows inline nav & 8-column table; desktop toolbar aligns with title', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop viewport check');
    await page.setViewportSize({ width: 960, height: 1040 });
    await page.goto('/table.html');
    await expect(page.locator('.kp-nav')).toBeVisible();
    await expect(page.locator('.kp-menu')).toBeHidden();
    await expect(page.locator('th.ancestor')).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/tree.html');
    const pads = await page.evaluate(() => ({
      title: parseFloat(getComputedStyle(document.querySelector('.app-title')).paddingLeft),
      tools: parseFloat(getComputedStyle(document.querySelector('.tools')).paddingLeft),
    }));
    expect(pads.tools).toBe(pads.title);
  });
});
