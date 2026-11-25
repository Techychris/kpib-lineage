'use strict';

const { test, expect } = require('@playwright/test');

test.describe('Member Table (table.html)', () => {
  test('renders all 618 brothers with data-label attributes, live search, aliases, and XSS-safe line names', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/table.html');
    await expect(page.locator('#status')).toHaveText('618 members');
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('#members tr')).toHaveCount(618);

    // Every data cell carries official Design System data-label (DS-06)
    const labels = await page.locator('#members tr').first().locator('td[data-label]').evaluateAll(
      els => els.map(e => e.getAttribute('data-label'))
    );
    expect(labels).toEqual(['School', 'Crossing', 'Big Brother', 'Kids', 'Class dad', 'Lineage', 'Founder']);

    // Diacritic-insensitive search ("deja vu")
    await page.locator('#query').fill('deja vu');
    await expect(page.locator('#members tr')).toHaveCount(1);
    await expect(page.locator('#members tr').first()).toContainText('Sabiel Carrillo');

    // Alias search ("Jose Reyes" -> Jose Anaya)
    await page.locator('#query').fill('Jose Reyes');
    await expect(page.locator('#members tr')).toHaveCount(1);
    await expect(page.locator('#members tr').first()).toContainText('Jose Anaya');

    // Literal <> line name renders safely as text, not raw HTML
    await page.locator('#query').fill('tacti');
    await expect(page.locator('#members tr').first()).toContainText('<!TACTI.C>');

    // Empty state updates status and data-state="empty"
    await page.locator('#query').fill('<script>alert(1)</script>');
    await expect(page.locator('#members tr')).toHaveCount(0);
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'empty');
    expect(errors).toEqual([]);
  });

  test('school filters, column sorting, kids disclosure, and sessionStorage state restoration across navigation', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop table header sort & open filter chips flow');
    await page.goto('/table.html');

    // Filter to Northwestern (8 brothers)
    await page.locator('#schools button', { hasText: 'Northwestern' }).click();
    await expect(page.locator('#members tr')).toHaveCount(8);
    await expect(page.locator('#status')).toHaveText('8 of 618 members');

    // Reset to All schools and sort by Kids (defaults to descending: most kids first)
    await page.locator('#schools button', { hasText: 'All schools' }).click();
    await page.locator('th button[data-sort="kids"]').click();
    await expect(page.locator('th button[data-sort="kids"]').locator('..')).toHaveAttribute('aria-sort', 'descending');

    // Open first brother's <details class="roster-kids"> disclosure
    const firstDetails = page.locator('#members tr').first().locator('details.roster-kids');
    await firstDetails.locator('summary').click();
    await expect(firstDetails).toHaveAttribute('open', '');
    expect(await firstDetails.locator('li a').count()).toBeGreaterThan(0);

    // Filter + navigate to tree.html, then return to table.html -> restores query, school, and sort from sessionStorage
    await page.locator('#schools button', { hasText: 'Mizzou' }).click();
    await expect(page.locator('#members tr')).toHaveCount(35);
    await page.locator('#members tr').first().locator('a[href^="tree.html"]').first().click();
    await expect(page).toHaveURL(/tree\.html\?member=\d+$/);

    await page.goto('/table.html');
    await expect(page.locator('#members tr')).toHaveCount(35);
    await expect(page.locator('#schools button[aria-pressed="true"]')).toContainText('Mizzou');
    await expect(page.locator('th button[data-sort="kids"]').locator('..')).toHaveAttribute('aria-sort', 'descending');
  });
});
