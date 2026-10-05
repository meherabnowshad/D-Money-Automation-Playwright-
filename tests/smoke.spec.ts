import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { CashInPage } from '../pages/CashInPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { SelfStatementPage } from '../pages/SelfStatementPage';
import { ApiHelper } from '../utils/apiHelper';
import { CsvHelper } from '../utils/csvHelper';
import { generateRandomAgentData, CREDENTIALS, getTodaysDateFormatted } from '../utils/testData';

test.describe('DMoney Positive Journey - Smoke Test Suite', () => {
  test('Positive End-to-End Workflow @smoke', async ({ page, request }) => {
    const apiHelper = new ApiHelper(request);
    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);
    const adminUsersPage = new AdminUsersPage(page);
    const cashInPage = new CashInPage(page);
    const resetPasswordPage = new ResetPasswordPage(page);
    const selfStatementPage = new SelfStatementPage(page);

    const agentData = generateRandomAgentData();
    const newPassword = 'SmokePassword123';
    const todaysDate = getTodaysDateFormatted();
    const csvFileName = `self_statement_${todaysDate}.csv`;

    // 1. Positive: Register Agent
    await registerPage.navigate();
    await registerPage.registerUser(agentData);
    expect(await registerPage.getAlertText()).toContain('Registration successful');

    // 2. Positive: Admin Login & Activate Agent
    await loginPage.navigate();
    await loginPage.fillCredentials(CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    await expect(page).toHaveURL(/.*profile/);
    await loginPage.saveStorageSession();

    await adminUsersPage.navigate();
    await adminUsersPage.searchUserByEmail(agentData.email);
    await adminUsersPage.clickUserView(agentData.email);
    await adminUsersPage.activateUser();
    expect((await adminUsersPage.getDetailStatus()).toUpperCase()).toContain('ACTIVE');

    await adminUsersPage.logout();

    // 3. Positive: System Login & Deposit 2000 Tk to Agent
    await loginPage.fillCredentials(CREDENTIALS.system.email, CREDENTIALS.system.password);
    await expect(page).toHaveURL(/.*profile/);
    await loginPage.saveStorageSession();

    await cashInPage.navigate();
    await cashInPage.performCashIn(agentData.phone, 2000);
    await expect(page.getByText('SYSTEM deposit to Agent successful')).toBeVisible();

    await cashInPage.logout();

    // 4. Positive: Agent Login & Deposit 500 Tk to Customer
    await loginPage.fillCredentials(agentData.email, agentData.password);
    await expect(loginPage.otpHeading).toBeVisible();
    const otp1 = await apiHelper.getUserOtp(agentData.email);
    await loginPage.submitOtp(otp1);
    await expect(page).toHaveURL(/.*profile/);
    await loginPage.saveStorageSession();

    expect(await loginPage.getCurrentBalance()).toBe('2000.00');

    const customerPhone = await apiHelper.getEligibleCustomerPhone();
    await cashInPage.navigate();
    await cashInPage.performCashIn(customerPhone, 500);
    await expect(page.getByText(/Deposit successful|Cash in successful/i)).toBeVisible();

    await loginPage.logout();

    // 5. Positive: Reset Password & Login with New Password
    await resetPasswordPage.navigateForgotPassword();
    await resetPasswordPage.requestResetLink(agentData.email);
    const resetToken = await apiHelper.getUserResetToken(agentData.email);

    await resetPasswordPage.navigateResetPassword(resetToken);
    await resetPasswordPage.resetPassword(newPassword);
    expect(await resetPasswordPage.getAlertText()).toContain('Your password has been reset successfully');

    await loginPage.navigate();
    await loginPage.fillCredentials(agentData.email, newPassword);
    await expect(loginPage.otpHeading).toBeVisible();
    const otp2 = await apiHelper.getUserOtp(agentData.email);
    await loginPage.submitOtp(otp2);
    await expect(page).toHaveURL(/.*profile/);
    await loginPage.saveStorageSession();

    // 6. Positive: View Self Statement & Export to CSV
    await selfStatementPage.navigate();
    await selfStatementPage.setDateRange('2026-10-01', '2026-10-10');
    const statementData = await selfStatementPage.exportToCsv(csvFileName);

    expect(statementData.rows.length).toBeGreaterThan(0);
    expect(CsvHelper.fileExists(csvFileName)).toBeTruthy();
  });
});
