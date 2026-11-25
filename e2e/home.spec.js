'use strict';

const { test, expect } = require('@playwright/test');

test.describe('Home page (index.html)', () => {
  test('renders brand chrome, single primary red CTA, 6 founders, and zero console/page errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await expect(page).toHaveTitle('Kappa Pi Beta Lineage');
    await expect(page.locator('h1')).toHaveText('The lineage tree');

    // Lockup image loads properly
    const naturalWidth = await page.locator('.kp-hdr .kp-plate img').evaluate(img => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    // Design System DS-04: exactly one primary red button in the hero
    await expect(page.locator('.kp-btn.p')).toHaveCount(1);
    await expect(page.locator('.kp-btn.p')).toHaveText('Search');

    // 6 founder cards & 3 reading-guide cards
    await expect(page.locator('a.kp-card')).toHaveCount(6);
    await expect(page.locator('#how-to-read .kp-card')).toHaveCount(3);
    expect(errors).toEqual([]);
  });

  test('live hero search combobox: lazy-loads data, ranks prefix hits, supports keyboard & pointer navigation', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('#homeSearch');
    const list = page.locator('#homeSuggest');
    const liveStatus = page.locator('#homeSearchStatus');

    // Prefix + overflow handling
    await input.fill('a');
    await expect(list).toBeVisible();
    await expect(list.locator('li[role="option"]')).toHaveCount(6);
    await expect(list.locator('li.none')).toContainText('more. Press Search to see all.');
    await expect(liveStatus).toContainText('matching members');

    // Non-matching query shows empty message
    await input.fill('zzzznotabrother');
    await expect(list.locator('li.none')).toHaveText('No member matches');
    await expect(liveStatus).toHaveText('No member matches');

    // Escape closes, ArrowDown reopens (UX-16)
    await input.fill('Smooth');
    await expect(list.locator('li[role="option"]')).toHaveCount(1);
    await expect(list.locator('li[role="option"]').first()).toContainText('So Smooth');
    await input.press('Escape');
    await expect(list).toBeHidden();
    await input.press('ArrowDown');
    await expect(list).toBeVisible();

    // Keyboard ArrowDown + Enter opens member in tree.html
    await input.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-activedescendant', 'hs0');
    await input.press('Enter');
    await expect(page).toHaveURL(/tree\.html\?member=0$/);
    await expect(page.locator('#memberName')).toHaveText('Christopher Flores');
  });

  test('submitting hero search form and clicking founder card navigate to tree.html', async ({ page }) => {
    await page.goto('/');
    await page.locator('#homeSearch').fill('Gozun');
    await page.locator('.kp-herosearch button[type="submit"]').click();
    await expect(page).toHaveURL(/tree\.html/);
    await expect(page.locator('#matches button')).toHaveCount(2);

    await page.goto('/');
    await page.locator('a.kp-card', { hasText: 'Maestro' }).click();
    await expect(page).toHaveURL(/tree\.html\?member=1$/);
    await expect(page.locator('#memberName')).toHaveText('Alfred Gozun');
  });

  test('desktop focus on hero search does not auto-scroll the viewport (UX-09)', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'Fine-pointer desktop focus scroll guard');
    await page.goto('/');
    const beforeY = await page.evaluate(() => window.scrollY);
    await page.locator('#homeSearch').click();
    await page.waitForTimeout(350);
    const afterY = await page.evaluate(() => window.scrollY);
    expect(afterY).toBe(beforeY);
  });
});
