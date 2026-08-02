import { test, expect } from '@playwright/test';

// Group tests that require Super Admin access
test.describe('Super Admin Permissions', () => {
  // Use the Super Admin state
  test.use({ storageState: 'playwright/.auth/sa.json' });

  test('should be able to access maintenance settings', async ({ page }) => {
    await page.goto('/maintenance/work-types');
    await expect(page.locator('.page-header__title')).toHaveText(/Work Types/i);
    // SA should see the Create button
    await expect(page.getByRole('button', { name: /Add New Work Type/i })).toBeVisible();
  });
});

// Group tests that require Engineer access
test.describe('Engineer Permissions', () => {
  // Use the Engineer state
  test.use({ storageState: 'playwright/.auth/eng.json' });

  test('should not be able to create new customers', async ({ page }) => {
    await page.goto('/customer/list');
    // The Engineer should be able to see the list but NOT the Add button
    const addBtn = page.getByRole('button', { name: /Add New Customer/i });
    await expect(addBtn).toBeHidden();
  });

  test('should not be able to access maintenance routes', async ({ page }) => {
    // Navigating directly to a forbidden route should show Error or redirect
    await page.goto('/maintenance/work-types');
    
    // Check if the page redirects to dashboard or shows a 403 error page
    // (Depending on exact implementation, but assuming it redirects to dashboard or error)
    await expect(page).toHaveURL(/.*(\/dashboard|\/error)/);
  });
});
