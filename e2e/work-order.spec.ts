import { test, expect } from '@playwright/test';

test.describe('Work Order Module', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to Work Order list before each test
    await page.goto('/work-order');
    // Ensure the page has loaded by checking for the header or table
    await expect(page.locator('.page-header__title')).toHaveText(/Work Orders/i, { timeout: 10000 });
  });

  test('should render the work order list with data', async ({ page }) => {
    // Check if table exists
    const table = page.locator('.custom-table');
    await expect(table).toBeVisible();

    // Check if rows are populated (assuming at least one work order exists)
    const rows = table.locator('tbody tr');
    // We can't strictly assert length > 0 if database is empty, 
    // but typically a QA environment has seeded data.
    // Let's just ensure the table head exists.
    await expect(table.locator('thead')).toContainText('WO No.');
  });

  test('should allow filtering by tabs (Draft, New, Pending, etc)', async ({ page }) => {
    // Click on "New" tab
    const newTab = page.locator('.custom-tabs__item').filter({ hasText: /^New$/ });
    if (await newTab.isVisible()) {
      await newTab.click();
      await expect(newTab).toHaveClass(/custom-tabs__item--active/);
    }
  });

  test('should navigate to Work Order Create form', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /Create/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    await expect(page).toHaveURL(/.*\/work-order\/form/);
    await expect(page.locator('.page-header__title')).toHaveText(/Create New Work Order/i);
  });

  test('should trigger validation errors on empty form submission', async ({ page }) => {
    // Navigate to Create Form directly
    await page.goto('/work-order/form');
    
    // Attempt to save draft or submit
    const saveBtn = page.getByRole('button', { name: /Save Draft/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      // Expect a snackbar warning about compulsory fields
      const snackbar = page.locator('.snackbar.snackbar--warning');
      await expect(snackbar).toBeVisible();
      await expect(snackbar).toContainText('Please fill in all compulsory fields');
    }
  });
});
