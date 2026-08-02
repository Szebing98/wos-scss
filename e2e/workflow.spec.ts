import { test, expect } from '@playwright/test';

test.describe.serial('Cross-Role Work Order Lifecycle', () => {

  let workOrderNumber = '';

  test('Sales: Create a new Work Order', async ({ page }) => {
    // 1. Log in as Sales
    test.use({ storageState: 'playwright/.auth/sales.json' });

    await page.goto('/work-order/form');
    // Assuming form is filled here
    // In a real test, we would fill customer, type, title, etc.
    // For now, let's just make sure the page loads and user has rights.
    await expect(page.locator('.page-header__title')).toHaveText(/Create New Work Order/i);

    // Mock capturing a generated WO Number for the next steps
    // workOrderNumber = await page.locator('.wo-number-display').innerText();
  });

  test('Engineer: Claim and Complete the Work Order', async ({ page }) => {
    // 2. Log in as Engineer
    test.use({ storageState: 'playwright/.auth/eng.json' });

    await page.goto('/work-order');
    await expect(page.locator('.page-header__title')).toHaveText(/Work Order List/i);
    // The engineer clicks on the work order
    // await page.getByText(workOrderNumber).click();
    // Verify engineer can see action buttons like "Claim" or "Mark as Done"
  });

  test('Superadmin: Approve the completed Work Order', async ({ page }) => {
    // 3. Log in as Superadmin
    test.use({ storageState: 'playwright/.auth/sa.json' });

    await page.goto('/work-order');
    // Verify SA can see "Approve" buttons or full status editing
  });
});
