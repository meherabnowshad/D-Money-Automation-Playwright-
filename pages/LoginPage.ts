import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly identifierInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly otpHeading: Locator;
  readonly otpInput: Locator;
  readonly verifyOtpButton: Locator;
  readonly alertMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.identifierInput = page.getByPlaceholder('Enter email or phone number');
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.getByRole('button', { name: /Login/i });
    this.otpHeading = page.getByText('Verify Your Identity');
    this.otpInput = page.getByPlaceholder('• • • •');
    this.verifyOtpButton = page.getByRole('button', { name: /Verify OTP/i });
    this.alertMessage = page.locator('.MuiAlert-message');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/login');
    if (!this.page.url().includes('/login')) {
      await this.page.context().clearCookies();
      await this.page.evaluate(() => localStorage.clear());
      await this.page.goto('/login');
    }
    await this.identifierInput.waitFor({ state: 'visible' });
  }

  async fillCredentials(identifier: string, password: string): Promise<void> {
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async isOtpScreenVisible(timeout = 5000): Promise<boolean> {
    try {
      await this.otpHeading.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async submitOtp(otp: string): Promise<void> {
    await this.otpInput.fill(otp);
    await this.verifyOtpButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async saveStorageSession(storagePath = 'auth.json'): Promise<void> {
    await this.page.context().storageState({ path: storagePath });
  }

  async getAlertText(): Promise<string> {
    return (await this.alertMessage.innerText()).trim();
  }
}
