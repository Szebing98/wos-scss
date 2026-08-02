import { test, expect } from '@playwright/test';

test.describe('User Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/list');
    await expect(page.locator('.page-header__title')).toHaveText(/Employees/i, { timeout: 10000 });
  });

  test('should render employee list', async ({ page }) => {
    const table = page.locator('.custom-table');
    await expect(table).toBeVisible();
    await expect(table.locator('thead')).toContainText('Email');
  });

  test('should navigate to Create Employee form', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /Add New Employee/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page).toHaveURL(/.*\/user\/form/);
    }
  });
});
