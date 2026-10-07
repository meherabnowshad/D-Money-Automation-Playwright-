import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { CashInPage } from '../pages/CashInPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { SelfStatementPage } from '../pages/SelfStatementPage';
import { GmailHelper } from '../utils/gmailHelper';
import { CsvHelper } from '../utils/csvHelper';
import { generateRandomAgentData, CREDENTIALS, getTodaysDateFormatted } from '../utils/testData';

test.describe('DMoney E2E User Journey - Regression Test Suite', () => {
  // Start from a clean, logged-out state
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Complete End-to-End Agent Lifecycle and Transactions @regression', async ({ page }) => {
    const gmailHelper = new GmailHelper();
    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);
    const adminUsersPage = new AdminUsersPage(page);
    const cashInPage = new CashInPage(page);
    const resetPasswordPage = new ResetPasswordPage(page);
    const selfStatementPage = new SelfStatementPage(page);

    const agentData = generateRandomAgentData();
    const newPassword = 'NewPassword5678';
    const todaysDate = getTodaysDateFormatted();
    const csvFileName = `self_statement_${todaysDate}.csv`;

    // 1. Open DMoney portal and navigate to Sign Up
    await registerPage.navigate();

    // 2. Register a new user with the Agent role
    await registerPage.registerUser(agentData);

    // 3. Validation: Verify Agent registration is successful
    const registerAlert = await registerPage.getAlertText();
    expect(registerAlert).toContain('Registration successful');

    // 4. Admin login
    await loginPage.navigate();
    await loginPage.fillCredentials(CREDENTIALS.admin.email, CREDENTIALS.admin.password);

    // 5. Validation: Verify Admin login is successful
    await expect(page).toHaveURL(/.*profile/);
    await loginPage.saveStorageSession();

    // 6. Navigate to Admin user list
    await adminUsersPage.navigate();

    // 7. Locate newly created Agent
    await adminUsersPage.searchUserByEmail(agentData.email);

    // 8. Validation: Verify Agent appears in Admin user list
    const agentRow = adminUsersPage.getUserRow(agentData.email);
    await expect(agentRow).toBeVisible();

    // 9. Validation: Verify newly created Agent is initially inactive (PENDING)
    const initialStatus = await adminUsersPage.getUserStatusInList(agentData.email);
    expect(initialStatus.toUpperCase()).toContain('PENDING');

    // 10. Open user details and activate Agent
    await adminUsersPage.clickUserView(agentData.email);
    await adminUsersPage.activateUser();

    // 11. Validation: Verify Admin can activate the Agent
    const activeStatus = await adminUsersPage.getDetailStatus();
    expect(activeStatus.toUpperCase()).toContain('ACTIVE');

    // 12. Validation: Verify Agent remains active after page reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    const statusAfterReload = await adminUsersPage.getDetailStatus();
    expect(statusAfterReload.toUpperCase()).toContain('ACTIVE');

    // 13. Log out from Admin account
    await adminUsersPage.logout();
    await expect(page).toHaveURL(/.*login/);

    // 14. Log in using the System account
    await loginPage.fillCredentials(CREDENTIALS.system.email, CREDENTIALS.system.password);

    // 15. Validation: Verify System login is successful
    await expect(page).toHaveURL(/.*profile/);
    await loginPage.saveStorageSession();

    // 16. System deposits 2000 Tk to the Agent
    await cashInPage.navigate();
    await cashInPage.performCashIn(agentData.phone, 2000);

    // 17. Validation: Verify System deposit is successful and creates transaction record
    await expect(page.getByText('SYSTEM deposit to Agent successful')).toBeVisible();
    await expect(page.getByText('TRANSACTION ID')).toBeVisible();
    await expect(page.getByText('৳ 2000.00')).toBeVisible();
    const systemTxnId = await cashInPage.getTransactionId();
    expect(systemTxnId).toBeTruthy();

    // 18. Log out from System account
    await cashInPage.logout();
    await expect(page).toHaveURL(/.*login/);

    // 19. Log in using the newly created Agent account
    const loginTime = Date.now() - 30000;
    await loginPage.fillCredentials(agentData.email, agentData.password);
    await expect(loginPage.otpHeading).toBeVisible();

    const agentOtp = await gmailHelper.waitForLatestOtp({ recipientEmail: agentData.email, minTimestamp: loginTime });
    await loginPage.submitOtp(agentOtp);

    // 20. Validation: Verify Agent can log in after activation
    await expect(page).toHaveURL(/.*profile/);
    await loginPage.saveStorageSession();

    // 21. Validation: Verify Agent balance is exactly 2000 Tk
    const initialAgentBalance = await loginPage.getCurrentBalance();
    expect(initialAgentBalance).toBe('2000.00');

    // 22. Get an existing customer and deposit 500 Tk
    const customerPhone = CREDENTIALS.customer.phone;
    await cashInPage.navigate();
    await cashInPage.performCashIn(customerPhone, 500);

    // 23. Validation: Verify transaction is completed successfully
    await expect(page.getByText(/Deposit successful|Cash in successful/i)).toBeVisible();
    await expect(page.getByText('TRANSACTION ID')).toBeVisible();
    await expect(page.getByText('৳ 500.00')).toBeVisible();

    // 24. Validation: Verify Agent balance is updated correctly after transaction
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const updatedAgentBalance = await loginPage.getCurrentBalance();
    expect(Number(updatedAgentBalance)).toBeLessThan(2000);

    // 25. Log out from Agent account
    await loginPage.logout();
    await expect(page).toHaveURL(/.*login/);

    // 26. Reset Agent account password
    const resetTime = Date.now() - 30000;
    await resetPasswordPage.navigateForgotPassword();
    await resetPasswordPage.requestResetLink(agentData.email);
    const resetAlert = await resetPasswordPage.getAlertText();
    expect(resetAlert).toMatch(/password reset link has been sent/i);

    const resetToken = await gmailHelper.waitForLatestResetToken({ recipientEmail: agentData.email, minTimestamp: resetTime });
    expect(resetToken).toBeTruthy();

    await resetPasswordPage.navigateResetPassword(resetToken);
    await resetPasswordPage.resetPassword(newPassword);

    // 27. Validation: Verify Agent password reset works successfully
    const resetSuccessAlert = await resetPasswordPage.getAlertText();
    expect(resetSuccessAlert).toMatch(/password has been reset successfully/i);

    // 28. Validation: Verify login with old password fails
    await loginPage.navigate();
    await loginPage.fillCredentials(agentData.email, agentData.password);
    const loginError = await loginPage.getAlertText();
    expect(loginError.toLowerCase()).toMatch(/password incorrect|invalid credentials|failed/i);

    // 29. Validation: Verify login with newly reset password succeeds
    const postResetTime = Date.now() - 5000;
    await loginPage.fillCredentials(agentData.email, newPassword);
    await expect(loginPage.otpHeading).toBeVisible();

    const newOtp = await gmailHelper.waitForLatestOtp({
      recipientEmail: agentData.email,
      minTimestamp: postResetTime,
      excludeOtp: agentOtp,
    });
    await loginPage.submitOtp(newOtp);
    await expect(page).toHaveURL(/.*profile/);
    await loginPage.saveStorageSession();

    // 30. Navigate to Self Statement section
    await selfStatementPage.navigate();

    // Ensure date filter covers today's transactions
    await selfStatementPage.setDateRange('2026-10-01', '2026-10-10');

    // 31. Extract all data available in Self Statement table
    const statementData = await selfStatementPage.exportToCsv(csvFileName);

    // 32. Validation: Verify Self Statement contains expected transaction records
    expect(statementData.headers).toContain('Transaction ID');
    expect(statementData.headers).toContain('Sender Account');
    expect(statementData.headers).toContain('Receiver Account');
    expect(statementData.rows.length).toBeGreaterThan(0);

    const hasDepositRecord = statementData.rows.some(
      row => row.some(cell => cell.includes('Top-up from SYSTEM') || cell.includes('SYSTEM'))
    );
    expect(hasDepositRecord).toBeTruthy();

    const hasCustomerCashInRecord = statementData.rows.some(
      row => row.some(cell => cell.includes(customerPhone) || cell.includes('500.00'))
    );
    expect(hasCustomerCashInRecord).toBeTruthy();

    // 33. Validation: Verify Self Statement data is successfully saved into required CSV file
    expect(CsvHelper.fileExists(csvFileName)).toBeTruthy();
    const csvContent = CsvHelper.readCsv(csvFileName);
    expect(csvContent).toContain('Transaction ID');
    expect(csvContent).toContain(customerPhone);
  });
});
