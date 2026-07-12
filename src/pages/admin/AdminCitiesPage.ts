import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminCitiesPage — Page Object for the Admin Cities reference data page.
 * URL: admin.jobrator.com/cities
 */
export class AdminCitiesPage extends BasePage {
  private readonly citiesTable =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  private readonly stateColumn =
    'th:has-text("State"), th:has-text("state"), td[class*="state"]';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}cities`);
    await this.page.waitForTimeout(3000);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector("table, tr, [class*=\"table\"], [class*=\"skills\"], [class*=\"list\"]", { timeout: 8000 }).catch(() => {});
    return this.lib.isVisible(this.citiesTable);
  }

  async hasStateColumn(): Promise<boolean> {
    return this.lib.isVisible(this.stateColumn);
  }

  async getRowCount(): Promise<number> {
    return this.lib.getCount(this.tableRows);
  }
}
