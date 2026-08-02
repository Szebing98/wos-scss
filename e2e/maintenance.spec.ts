import { test, expect } from '@playwright/test';

test.describe('Maintenance Module', () => {

  test('should render work types', async ({ page }) => {
    await page.goto('/maintenance/work-types');
    await expect(page.locator('.page-header__title')).toHaveText(/Work Types/i, { timeout: 10000 });
    await expect(page.locator('.custom-table')).toBeVisible();
  });

  test('should render locations', async ({ page }) => {
    await page.goto('/maintenance/location');
    await expect(page.locator('.page-header__title')).toHaveText(/Location/i, { timeout: 10000 });
    await expect(page.locator('.custom-table')).toBeVisible();
  });

  test('should render sites', async ({ page }) => {
    await page.goto('/maintenance/site');
    await expect(page.locator('.page-header__title')).toHaveText(/Site/i, { timeout: 10000 });
    await expect(page.locator('.custom-table')).toBeVisible();
  });

});
