import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { UserData } from '../utils/testData';

export class RegisterPage extends BasePage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly phoneInput: Locator;
  readonly nidInput: Locator;
  readonly roleCombobox: Locator;
  readonly submitButton: Locator;
  readonly alertMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.locator('input[name="name"]');
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.phoneInput = page.locator('input[name="phone_number"]');
    this.nidInput = page.locator('input[name="nid"]');
    this.roleCombobox = page.getByRole('combobox');
    this.submitButton = page.getByRole('button', { name: /Create Account/i });
    this.alertMessage = page.locator('.MuiAlert-message');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/register');
    if (!this.page.url().includes('/register')) {
      await this.page.context().clearCookies();
      await this.page.evaluate(() => localStorage.clear());
      await this.page.goto('/register');
    }
    await this.submitButton.waitFor({ state: 'visible' });
  }

  async registerUser(userData: UserData): Promise<void> {
    await this.nameInput.fill(userData.name);
    await this.emailInput.fill(userData.email);
    await this.passwordInput.fill(userData.password);
    await this.phoneInput.fill(userData.phone);
    await this.nidInput.fill(userData.nid);

    await this.roleCombobox.click();
    await this.page.getByRole('option', { name: new RegExp(userData.role, 'i') }).click();

    await this.submitButton.click();
  }

  async getAlertText(timeout = 5000): Promise<string> {
    try {
      const alert = this.page.locator('.MuiAlert-message, [role="alert"]').first();
      await alert.waitFor({ state: 'visible', timeout });
      return (await alert.innerText()).trim();
    } catch {
      if (this.page.url().includes('/login')) {
        return 'Registration successful';
      }
      return '';
    }
  }
}
