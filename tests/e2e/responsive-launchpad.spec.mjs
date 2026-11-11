import { expect, test } from '@playwright/test';

test('Launchpad and navigation fit phone, tablet, and desktop viewports without page overflow @compat', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: /DEFEND THE SHACKLETON BASE/i })).toBeVisible({ timeout: 15_000 });

  for (const viewport of [
    { width: 320, height: 700 },
    { width: 393, height: 852 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

    for (const selector of ['.arcade-nav-content', '.arcade-nav-actions', '.launchpad-hero', '.launchpad-hero-actions']) {
      const bounds = await page.locator(selector).boundingBox();
      expect(bounds, `${selector} should be visible`).not.toBeNull();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    }

    await expect(page.getByRole('button', { name: /IGNITE ENGINES & LAUNCH/ })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('button', { name: /LAUNCHPAD/ })).toBeVisible();
  }

  await page.getByRole('navigation').getByRole('button', { name: /76 MISSIONS/ }).click();
  await expect(page.getByRole('heading', { name: /Choose your next flight/ })).toBeVisible();
  await expect(page.getByText('76 HISTORICAL NASA MISSIONS · 5 ASTROCAMP SCENARIOS')).toBeVisible();
  await expect(page.locator('.campaign-card')).toHaveCount(81);

  await page.getByRole('button', { name: /All 81/ }).click();
  await expect(page.locator('.campaign-card')).toHaveCount(81);

  await page.getByLabel('Search missions').fill('Freedom 7');
  await expect(page.locator('.campaign-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: /Freedom 7/ })).toBeVisible();
});
