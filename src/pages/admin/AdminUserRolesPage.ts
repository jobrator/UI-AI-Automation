import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminUserRolesPage — Page Object for the Admin User Roles management page.
 * URL: admin.jobrator.com/user/role
 */
export class AdminUserRolesPage extends BasePage {
  // ── Table ─────────────────────────────────────────────────────────────────
  private readonly rolesTable =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  // ── Columns ───────────────────────────────────────────────────────────────
  private readonly idCol =
    'th:has-text("ID"), th:has-text("Id"), th:has-text("#")';

  private readonly nameCol =
    'th:has-text("Name"), th:has-text("name")';

  private readonly displayNameCol =
    'th:has-text("Display"), th:has-text("display"), th:has-text("Display Name")';

  private readonly actionsCol =
    'th:has-text("Actions"), th:has-text("Action"), td button, td a:has-text("Edit"), td a:has-text("Delete")';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}user/role`);
    await this.page.waitForTimeout(3000);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector("table, tr, [class*=\"table\"], [class*=\"skills\"], [class*=\"list\"]", { timeout: 8000 }).catch(() => {});
    return this.lib.isVisible(this.rolesTable);
  }

  // ── State queries ─────────────────────────────────────────────────────────

  async getRowCount(): Promise<number> {
    return this.lib.getCount(this.tableRows);
  }

  async hasIdColumn(): Promise<boolean> {
    return this.lib.isVisible(this.idCol);
  }

  async hasNameColumn(): Promise<boolean> {
    return this.lib.isVisible(this.nameCol);
  }

  async hasDisplayNameColumn(): Promise<boolean> {
    return this.lib.isVisible(this.displayNameCol);
  }

  async hasActionsColumn(): Promise<boolean> {
    return this.lib.isVisible(this.actionsCol);
  }
}
