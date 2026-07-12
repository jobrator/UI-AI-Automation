import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminCountriesPage — Page Object for the Admin Countries reference data page.
 * URL: admin.jobrator.com/countries
 */
export class AdminCountriesPage extends BasePage {
  private readonly countriesTable =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}countries`);
    await this.page.waitForTimeout(3000);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector("table, tr, [class*=\"table\"], [class*=\"skills\"], [class*=\"list\"]", { timeout: 8000 }).catch(() => {});
    return this.lib.isVisible(this.countriesTable);
  }

  async getRowCount(): Promise<number> {
    return this.lib.getCount(this.tableRows);
  }
}
