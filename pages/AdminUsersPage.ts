import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminUsersPage extends BasePage {
  readonly searchTypeDropdown: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly editUserButton: Locator;
  readonly saveChangesButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchTypeDropdown = page.locator('.MuiSelect-select').first();
    this.searchInput = page.getByPlaceholder('e.g., user@example.com');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.editUserButton = page.getByRole('button', { name: 'Edit User' });
    this.saveChangesButton = page.getByRole('button', { name: 'Save Changes' });
  }

  async navigate(): Promise<void> {
    await this.page.goto('/admin/users');
    await this.page.waitForLoadState('networkidle');
  }

  async searchUserByEmail(email: string): Promise<void> {
    await this.searchTypeDropdown.click();
    await this.page.getByRole('option', { name: 'Search by Email' }).click();
    await this.searchInput.fill(email);
    await this.searchButton.click();
    await this.page.waitForTimeout(1000);
  }

  getUserRow(email: string): Locator {
    return this.page.locator('tbody tr').filter({ hasText: email });
  }

  async getUserStatusInList(email: string): Promise<string> {
    const row = this.getUserRow(email);
    const chip = row.locator('.MuiChip-root');
    return (await chip.innerText()).trim();
  }

  async clickUserView(email: string): Promise<void> {
    const row = this.getUserRow(email);
    await row.getByRole('button', { name: 'View' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async activateUser(): Promise<void> {
    await this.editUserButton.click();
    await this.page.waitForTimeout(500);

    const statusCombo = this.page.locator('.MuiSelect-select').nth(1);
    await statusCombo.click();
    await this.page.getByRole('option', { name: 'Active' }).click();

    await this.saveChangesButton.click();
    await this.page.waitForTimeout(1500);
  }

  async getDetailStatus(): Promise<string> {
    const statusChip = this.page.locator('.MuiChip-root').filter({ hasText: /ACTIVE|PENDING|SUSPENDED/i }).first();
    return (await statusChip.innerText()).trim();
  }
}
