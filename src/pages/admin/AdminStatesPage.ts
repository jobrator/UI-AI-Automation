import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminStatesPage — Page Object for the Admin States reference data page.
 * URL: admin.jobrator.com/states
 */
export class AdminStatesPage extends BasePage {
  private readonly statesTable =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  private readonly countryColumn =
    'th:has-text("Country"), th:has-text("country"), td[class*="country"]';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}states`);
    await this.page.waitForTimeout(3000);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector("table, tr, [class*=\"table\"], [class*=\"skills\"], [class*=\"list\"]", { timeout: 8000 }).catch(() => {});
    return this.lib.isVisible(this.statesTable);
  }

  async hasCountryColumn(): Promise<boolean> {
    return this.lib.isVisible(this.countryColumn);
  }

  async getRowCount(): Promise<number> {
    return this.lib.getCount(this.tableRows);
  }
}
