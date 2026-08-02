import { test, expect, Page } from '@playwright/test';

// Use Sales account for creating work orders
test.use({ storageState: 'playwright/.auth/sales.json' });

test.describe('Work Order State Machine', () => {

  // Helper to fill the required fields to save a Draft or New Work Order
  async function fillRequiredFields(page: Page) {
    // Fill Title
    await page.locator('input[placeholder*="Title"], label:has-text("Title") + input').fill('Automated Test Work Order');
    
    // For Select / Autocomplete components, clicking the input usually opens a dropdown.
    // Then we select the first available option.

    // Select Work Type Item
    const workTypeItemGroup = page.locator('.autocomplete-field, .select-field').filter({ hasText: /Work Type Item/i });
    if (await workTypeItemGroup.isVisible()) {
      await workTypeItemGroup.locator('input, .select-control').first().click();
      try {
        await page.locator('.option-item').filter({ hasNotText: 'Select' }).first().waitFor({ state: 'visible', timeout: 2000 });
        await page.locator('.option-item').filter({ hasNotText: 'Select' }).first().click();
      } catch (e) {
        console.log('Work Type Item options not visible or selectable');
      }
    }



    // Select Sales Agent
    const salesAgentGroup = page.locator('.autocomplete-field, .select-field').filter({ hasText: /Sales Agent/i });
    if (await salesAgentGroup.isVisible()) {
      await salesAgentGroup.locator('input, .select-control').first().click();
      await salesAgentGroup.locator('input, .select-control').first().fill('SAL');
      try {
        await salesAgentGroup.locator('.option-item').first().waitFor({ state: 'visible', timeout: 5000 });
        await salesAgentGroup.locator('.option-item').first().click();
      } catch(e) {}
    }

    // Select Project PIC
    const picGroup = page.locator('.autocomplete-field, .select-field').filter({ hasText: /Project PIC/i });
    if (await picGroup.isVisible()) {
      await picGroup.locator('input, .select-control').first().click();
      await picGroup.locator('input, .select-control').first().fill('Mohamad');
      try {
        await picGroup.locator('.option-item').first().waitFor({ state: 'visible', timeout: 5000 });
        await picGroup.locator('.option-item').first().click();
      } catch(e) {}
    }

    // Select Customer
    const customerGroup = page.locator('.autocomplete-field, .select-field').filter({ hasText: /Customer/i });
    if (await customerGroup.isVisible()) {
      await customerGroup.locator('input, .select-control').first().click();
      try {
        await customerGroup.locator('.option-item').first().waitFor({ state: 'visible', timeout: 5000 });
        await customerGroup.locator('.option-item').first().click();
      } catch(e) {}
    }

    // Select Site
    const siteGroup = page.locator('.autocomplete-field, .select-field').filter({ hasText: /Choose an operational site/i });
    if (await siteGroup.isVisible()) {
      await siteGroup.locator('input, .select-control').first().click();
      try {
        await siteGroup.locator('.option-item').first().waitFor({ state: 'visible', timeout: 5000 });
        await siteGroup.locator('.option-item').first().click();
      } catch(e) {}
    }

    // Select Contract No
    const contractGroup = page.locator('.autocomplete-field, .select-field, .field-group').filter({ hasText: /Contract No/i });
    if (await contractGroup.isVisible()) {
      const control = contractGroup.locator('.autocomplete-control, .select-control, select, input').first();
      await control.click();
      const option = page.locator('.option-item, option, .p-dropdown-item').filter({ hasNotText: 'Select' }).first();
      try {
        await option.waitFor({ state: 'visible', timeout: 2000 });
        await option.click();
      } catch (e) {
        // Just ignore if there are no contracts for this customer
      }
    }

    // Fill Description
    await page.locator('textarea[placeholder*="Description"], label:has-text("Description") + textarea, .ql-editor').first().fill('This is an E2E testing description.');
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to Create Form
    await page.goto('/work-order');
    await page.locator('.add-workorder-btn').click();
    await page.getByPlaceholder('Type or select a work type...').click();
    await page.locator('.option-item').first().click();
    await page.getByRole('button', { name: /Proceed/i }).click();
    await expect(page.locator('.page-header h1, .title-area h1')).toHaveText(/Create New Work Order/i);
    await fillRequiredFields(page);
  });

  test('Draft -> Draft: Save as Draft', async ({ page }) => {
    // 1. Click "Save as Draft"
    const saveDraftBtn = page.getByRole('button', { name: /Save as Draft/i });
    await saveDraftBtn.click();

    // 2. Expect success snackbar
    await expect(page.locator('.snackbar.snackbar--success').first()).toBeVisible({ timeout: 10000 });
    
    // 3. Status Badge should say "Draft"
    const statusBadge = page.locator('.status-badge');
    await expect(statusBadge).toHaveText(/Draft/i);
  });

  test('Draft -> New: Submit from Draft', async ({ page }) => {
    // 1. Click "Save as Draft" to create the initial draft
    // 1. Click "Save as Draft"
    const saveDraftBtn = page.getByRole('button', { name: /Save as Draft/i });
    await saveDraftBtn.click();
    await expect(page.locator('.snackbar.snackbar--success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.status-badge')).toHaveText(/Draft/i, { timeout: 10000 });

    // 2. Click "Submit" (or Submit New)
    const submitBtn = page.getByRole('button', { name: /Submit/i, exact: true }).or(page.getByRole('button', { name: /Submit New/i }));
    await submitBtn.click();

    // 3. Expect status to transition to "New"
    await expect(page.locator('.status-badge')).toHaveText(/New/i, { timeout: 10000 });
  });

  test('Draft -> Pending: Request for Approval from Draft', async ({ page }) => {
    // 1. Click "Save as Draft" to create the initial draft
    // 1. Save as Draft
    const saveDraftBtn = page.getByRole('button', { name: /Save as Draft/i });
    await saveDraftBtn.click();
    await expect(page.locator('.snackbar.snackbar--success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.status-badge')).toHaveText(/Draft/i, { timeout: 10000 });

    // 2. Click "Save & Request Approval"
    const requestApprovalBtn = page.getByRole('button', { name: /Save & Request Approval/i });
    await requestApprovalBtn.click();

    // 3. Expect status to transition to "Pending Approval"
    await expect(page.locator('.status-badge')).toHaveText(/Pending Approval/i, { timeout: 10000 });
  });

  test('New = New: Save New', async ({ page }) => {
    // 1. First, create a "New" Work Order directly by clicking "Submit" on a brand new form
    // 1. Save New
    const submitBtn = page.getByRole('button', { name: /Submit/i, exact: true });
    await submitBtn.click();
    await expect(page.locator('.snackbar.snackbar--success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.status-badge')).toHaveText(/New/i, { timeout: 10000 });

    // 2. Make an edit
    await page.locator('textarea[placeholder*="Description"], label:has-text("Description") + textarea, .ql-editor').first().fill('Updated description for New WO.');

    // 3. Click "Save New" (which should just update, keeping status New)
    const saveNewBtn = page.getByRole('button', { name: /Save New/i });
    await saveNewBtn.click();

    // 4. Expect success and status remains "New"
    await expect(page.locator('.snackbar.snackbar--success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.status-badge')).toHaveText(/New/i);
  });

  test('New -> Pending: Request for Approval from New', async ({ page }) => {
    // 1. First, create a "New" Work Order directly by clicking "Submit"
    // 1. Save New
    const submitBtn = page.getByRole('button', { name: /Submit/i, exact: true });
    await submitBtn.click();
    await expect(page.locator('.snackbar.snackbar--success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.status-badge')).toHaveText(/New/i, { timeout: 10000 });

    // 2. Click "Request For Approval"
    const requestApprovalBtn = page.getByRole('button', { name: /Request For Approval/i });
    await requestApprovalBtn.click();

    // 3. Expect status to transition to "Pending Approval"
    await expect(page.locator('.status-badge')).toHaveText(/Pending Approval/i, { timeout: 10000 });
  });

});
