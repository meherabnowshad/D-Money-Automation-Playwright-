import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CashInPage extends BasePage {
  readonly customerInput: Locator;
  readonly amountInput: Locator;
  readonly cashInButton: Locator;

  constructor(page: Page) {
    super(page);
    this.customerInput = page.locator('input[name="customer"]');
    this.amountInput = page.locator('input[name="amount"]');
    this.cashInButton = page.getByRole('button', { name: /Cash In/i });
  }

  async navigate(): Promise<void> {
    await this.page.goto('/agent/cash-in');
    await this.page.waitForLoadState('networkidle');
  }

  async performCashIn(phone: string, amount: string | number): Promise<void> {
    await this.customerInput.fill(phone);
    await this.amountInput.fill(String(amount));
    await this.cashInButton.click();
    await this.page.waitForTimeout(2000);
  }

  async getTransactionId(): Promise<string> {
    const txnElement = this.page.locator('text=/TXN[A-Z0-9]+/').first();
    if (await txnElement.isVisible()) {
      return (await txnElement.innerText()).trim();
    }
    return '';
  }
}

