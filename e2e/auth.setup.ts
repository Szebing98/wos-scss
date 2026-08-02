import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const authDir = 'playwright/.auth';
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Define the users we want to authenticate
const users = [
  { role: 'sa', email: process.env.TEST_SA_USER, pass: process.env.TEST_SA_PASS },
  { role: 'sales', email: process.env.TEST_SALES_USER, pass: process.env.TEST_SALES_PASS },
  { role: 'eng', email: process.env.TEST_ENG_USER, pass: process.env.TEST_ENG_PASS },
  { role: 'admin', email: process.env.TEST_ADMIN_USER, pass: process.env.TEST_ADMIN_PASS },
  { role: 'manager', email: process.env.TEST_MANAGER_USER, pass: process.env.TEST_MANAGER_PASS }
];

for (const user of users) {
  setup(`authenticate as ${user.role}`, async ({ page }) => {
    // Skip if credentials are not provided
    if (!user.email || !user.pass) {
      console.log(`Skipping auth for ${user.role} due to missing credentials.`);
      return;
    }

    const authFile = path.join(authDir, `${user.role}.json`);

    await page.goto('/account/login');
    await page.locator('input[type="email"], input[name="email"], #email').first().fill(user.email);
    await page.locator('input[type="password"], input[name="password"], #password').first().fill(user.pass);
    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Wait for successful login
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 30000 });

    // Save the authentication state
    await page.context().storageState({ path: authFile });
  });
}
