const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { CREDENTIALS } = require('../utils/testData');

test.describe('Admin Login Tests', () => {
  // Clear stored session state so we start from a clean logged-out state
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should successfully log in as Admin', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 1. Navigate to login page
    await page.goto('/login');

    // 2. Submit Admin credentials
    await loginPage.fillCredentials(CREDENTIALS.admin.email, CREDENTIALS.admin.password);

    // 3. Verify Admin login succeeds and redirects to profile
    await expect(page).toHaveURL(/.*profile/);

    // 4. Verify Admin role is visible on dashboard
    await expect(page.getByText(/Admin/i).first()).toBeVisible();

    // 5. Save Admin session to auth.json
    await loginPage.saveStorageSession('auth.json');
  });
});
