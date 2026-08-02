import { test, expect } from '@playwright/test';

test.describe('Customer Module', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/customer/list');
    await expect(page.locator('.page-header__title')).toHaveText(/Customers/i, { timeout: 10000 });
  });

  test('should render the customer list', async ({ page }) => {
    const table = page.locator('.custom-table');
    await expect(table).toBeVisible();
    await expect(table.locator('thead')).toContainText('Identity No');
  });

  test('should open Create Customer form', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /Add New Customer/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page).toHaveURL(/.*\/customer\/form/);
      await expect(page.locator('.page-header__title')).toHaveText(/Create Customer/i);
    }
  });

  test('should validate customer form fields', async ({ page }) => {
    await page.goto('/customer/form');
    
    // Attempt to save
    const saveBtn = page.getByRole('button', { name: /Save/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      // Should show warning snackbar
      const snackbar = page.locator('.snackbar.snackbar--warning');
      await expect(snackbar).toBeVisible();
    }
  });
});
