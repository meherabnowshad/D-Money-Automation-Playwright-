import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { CsvHelper } from '../utils/csvHelper';

export class SelfStatementPage extends BasePage {
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly resetTodayButton: Locator;
  readonly statementTable: Locator;

  constructor(page: Page) {
    super(page);
    this.fromDateInput = page.locator('input[type="date"]').first();
    this.toDateInput = page.locator('input[type="date"]').nth(1);
    this.resetTodayButton = page.getByRole('button', { name: /RESET TO TODAY/i });
    this.statementTable = page.locator('table');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/agent/self-statement');
    await this.page.waitForLoadState('networkidle');
  }

  async setDateRange(fromDate = '2026-10-01', toDate?: string): Promise<void> {
    if (fromDate) {
      await this.fromDateInput.fill(fromDate);
    }
    if (toDate) {
      await this.toDateInput.fill(toDate);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const toDateStr = tomorrow.toISOString().split('T')[0];
      await this.toDateInput.fill(toDateStr);
    }
    await this.page.waitForTimeout(1000);
  }

  async getTableHeaders(): Promise<string[]> {
    return await this.page.$$eval('table thead th', ths => 
      ths.map(th => (th.textContent || '').trim())
    );
  }

  async getTableRows(): Promise<string[][]> {
    return await this.page.$$eval('table tbody tr', trs => 
      trs.map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => (td.textContent || '').trim().replace(/\s+/g, ' '))
      )
    );
  }

  async exportToCsv(filePath: string): Promise<{ headers: string[]; rows: string[][] }> {
    const headers = await this.getTableHeaders();
    const rows = await this.getTableRows();
    CsvHelper.writeTableToCsv(filePath, headers, rows);
    return { headers, rows };
  }
}

