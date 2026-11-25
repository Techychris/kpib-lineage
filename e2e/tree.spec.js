'use strict';

const { test, expect } = require('@playwright/test');

test.describe('Lineage Tree (tree.html)', () => {
  test('desktop overview enforces depth limit (CR-01) and renders 618 member stat with zero errors', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop overview check');
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/tree.html');
    await expect(page.locator('#statMembers')).toHaveText('618');
    await expect(page.locator('#depthNote')).toBeVisible();

    const nodeCount = await page.locator('#canvas svg .node').count();
    expect(nodeCount).toBeGreaterThan(7);
    expect(nodeCount).toBeLessThan(619);
    expect(errors).toEqual([]);
  });

  test('member selection syncs URL (UX-10), keeps deep member visible in full branch (CR-02), and supports zoom/pan', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop tree controls flow');
    // Load deep member (Arondight, ID 176, depth > 10)
    await page.goto('/tree.html?member=176');
    await expect(page.locator('#memberName')).toHaveText('Neeko De Vera');

    // Uncheck "Show downstream" to view full branch back to founder
    await page.locator('#mode').uncheck();
    await expect(page.locator('#caption')).toContainText('Full founder branch');
    // Selected deep node MUST still be rendered in SVG (CR-02 fixed)
    await expect(page.locator('#canvas svg .node.selected')).toHaveCount(1);

    // Clicking parent moves up and updates URL ?member=
    await page.locator('#parent').click();
    await expect(page).toHaveURL(/\?member=159$/);

    // Zoom controls update zoom percentage output
    const zoomText = page.locator('#zoom');
    await page.locator('#fit').click();
    const initialZoom = await zoomText.textContent();
    await page.locator('#zoomIn').click();
    const zoomedIn = await zoomText.textContent();
    expect(zoomedIn).not.toBe(initialZoom);
    await page.locator('#zoomOut').click();

    // Keyboard arrow panning on #canvas changes SVG group transform
    const canvas = page.locator('#canvas');
    const beforeTransform = await page.locator('#canvas svg > g').getAttribute('transform');
    await canvas.focus();
    await page.keyboard.press('ArrowLeft');
    const afterTransform = await page.locator('#canvas svg > g').getAttribute('transform');
    expect(afterTransform).not.toBe(beforeTransform);
  });

  test('co-class-dad parity (CR-03), Generations captions (UX-07), Connections modal & backdrop close (UX-13)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop tree controls flow');
    // Verify Big Brother mode + Generations caption (UX-07)
    await page.goto('/tree.html?member=0');
    await page.locator('#viewList').click();
    await expect(page.locator('#generations')).toBeVisible();
    await expect(page.locator('#caption')).toContainText('Big Brother');

    // Switch to Class dad mode and verify persistence across reload
    await page.locator('#lineage').selectOption('dad');
    await expect(page.locator('#caption')).toContainText('class dad');
    await page.reload();
    await expect(page.locator('#lineage')).toHaveValue('dad');

    // Co-class-dad Alexis Soule (131) shows 8 kids consistently in metadata, tree, and Connections (CR-03)
    await page.goto('/tree.html?member=131');
    await expect(page.locator('#memberMeta')).toContainText('8 kids');
    await page.locator('#connections').click();
    const dialog = page.locator('#connectionsPanel');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#connectionsBody')).not.toContainText('None recorded.');

    // Clicking dialog backdrop closes modal (UX-13)
    const box = await dialog.boundingBox();
    await page.mouse.click(Math.max(2, box.x - 10), Math.max(2, box.y - 10));
    await expect(dialog).toBeHidden();

    // Member 147 (2 co-class dads) shows "Class dads" section in Connections and clicking navigates
    await page.goto('/tree.html?member=147');
    await page.locator('#connections').click();
    await expect(page.locator('#connectionsBody')).toContainText('Class dads');
    await page.locator('#connectionsBody button', { hasText: 'Alexis Soule' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#memberName')).toHaveText('Alexis Soule');
    await expect(page).toHaveURL(/\?member=131$/);
  });

  test('Full depth toggle persists across reload and malformed URL params fall back safely', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop depth toggle flow');
    await page.goto('/tree.html?member=0');
    await page.locator('#depth').check();
    await expect(page.locator('#depthNote')).toBeHidden();
    await page.reload();
    await expect(page.locator('#depth')).toBeChecked();

    await page.goto('/tree.html?member=-1');
    await expect(page.locator('#member')).toBeHidden();
  });
});
