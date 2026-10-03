import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly avatarButton: Locator;
  readonly logoutMenuItem: Locator;
  readonly balanceButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.avatarButton = page.locator('header .MuiAvatar-root');
    this.logoutMenuItem = page.getByRole('menuitem', { name: /Logout/i });
    this.balanceButton = page.getByRole('button', { name: /Balance/i });
  }

  async logout(): Promise<void> {
    await this.avatarButton.click();
    await this.logoutMenuItem.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getCurrentBalance(): Promise<string> {
    const profileBalanceInput = this.page.getByLabel('Current Balance (BDT)');
    if (await profileBalanceInput.isVisible()) {
      return (await profileBalanceInput.inputValue()).trim();
    }
    return '';
  }
}

