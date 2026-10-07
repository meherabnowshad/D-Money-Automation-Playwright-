import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ResetPasswordPage extends BasePage {
  readonly forgotEmailInput: Locator;
  readonly sendResetLinkButton: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly resetPasswordButton: Locator;
  readonly successAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.forgotEmailInput = page.locator('input').first();
    this.sendResetLinkButton = page.getByRole('button', { name: /Send Reset Link/i });
    this.newPasswordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.resetPasswordButton = page.getByRole('button', { name: /Reset Password/i });
    this.successAlert = page.locator('.MuiAlert-message');
  }

  async navigateForgotPassword(): Promise<void> {
    await this.page.goto('/forgot-password');
    await this.page.waitForLoadState('networkidle');
  }

  async requestResetLink(email: string): Promise<void> {
    await this.forgotEmailInput.fill(email);
    await this.sendResetLinkButton.click();
    await this.page.waitForTimeout(1000);
  }

  async navigateResetPassword(token: string): Promise<void> {
    await this.page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
    await this.page.waitForLoadState('networkidle');
  }

  async resetPassword(newPassword: string): Promise<void> {
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(newPassword);
    await this.resetPasswordButton.click();
    await this.page.waitForTimeout(1000);
  }

  async getAlertText(): Promise<string> {
    return (await this.successAlert.innerText()).trim();
  }
}