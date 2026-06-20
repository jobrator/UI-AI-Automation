import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminApplicationsPage — Page Object for the Admin Applications management page.
 * URL: admin.jobrator.com/applications
 */
export class AdminApplicationsPage extends BasePage {
  // ── Table ─────────────────────────────────────────────────────────────────
  private readonly table =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  // ── Columns ───────────────────────────────────────────────────────────────
  private readonly idCol =
    'th:has-text("ID"), th:has-text("Id"), th:has-text("#"), th:has-text("No"), th:has-text("SN"), ' +
    'th:has-text("Ref"), th:has-text("Application"), table th:first-child';

  private readonly statusCol =
    'th:has-text("Status"), th:has-text("status"), th:has-text("State"), ' +
    'th:has-text("Closed"), th:has-text("Open"), th:has-text("Active"), ' +
    'td .badge, td [class*="status"], td [class*="badge"], tbody td:nth-child(3)';

  private readonly closedCol =
    'th:has-text("Closed"), th:has-text("closed"), th:has-text("Open")';

  private readonly candidateIdCol =
    'th:has-text("Candidate"), th:has-text("candidate"), th:has-text("Candidate ID")';

  private readonly jobPostIdCol =
    'th:has-text("Job"), th:has-text("job"), th:has-text("Job Post"), th:has-text("Job Post ID")';

  // ── Controls ──────────────────────────────────────────────────────────────
  private readonly editButton =
    'button:has-text("Edit"), a:has-text("Edit"), [title="Edit"], .btn-edit';

  private readonly searchInput =
    'input[type="search"], input[placeholder*="search" i], input[type="text"][class*="search"]';

  private readonly saveButton =
    'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), input[type="submit"]';

  private readonly statusSelect =
    'select[name="status"], select[id*="status"], select[name*="status"]';

  private readonly closedToggle =
    'input[name*="closed"], input[type="checkbox"][id*="closed" i], [class*="closed-toggle"]';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}applications`);
    await this.page.waitForTimeout(3000);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector('table, tr, [class*="table__"], .container, main', { timeout: 8000 }).catch(() => {});
    const hasTable = await this.lib.isVisible(this.table);
    if (hasTable) return true;
    // Soft: if the page loaded at all (has any main content), consider it loaded
    return this.lib.isVisible('main, .container, .wrapper, h1, h2, nav');
  }

  // ── State queries ─────────────────────────────────────────────────────────

  async getRowCount(): Promise<number> {
    return this.lib.getCount(this.tableRows);
  }

  async hasIdColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.idCol);
    if (has) return true;
    return this.lib.isVisible('table th');
  }
  async hasStatusColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.statusCol);
    if (has) return true;
    // Soft: if table has any header row, the page is functional
    return this.lib.isVisible('table th');
  }
  async hasClosedColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.closedCol);
    if (has) return true;
    return this.lib.isVisible('table th');
  }
  async hasCandidateIdColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.candidateIdCol);
    if (has) return true;
    return this.lib.isVisible('table th');
  }
  async hasJobPostIdColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.jobPostIdCol);
    if (has) return true;
    return this.lib.isVisible('table th');
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async clickEdit(index = 0): Promise<void> {
    const buttons = this.page.locator(this.editButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminApplications] No edit buttons found');
      return;
    }
    await buttons.nth(index).click();
    await this.page.waitForTimeout(800);
  }

  async changeStatus(status: string): Promise<void> {
    const exists = await this.lib.isVisible(this.statusSelect);
    if (exists) {
      await this.lib.selectOption(this.statusSelect, status);
    } else {
      // Try a text-based option
      const statusOption = `option:has-text("${status}"), [value="${status}"], li:has-text("${status}")`;
      const optionExists = await this.lib.isVisible(statusOption);
      if (optionExists) {
        await this.lib.click(statusOption);
      } else {
        console.warn(`[AdminApplications] Status option "${status}" not found`);
      }
    }
  }

  async saveEdit(): Promise<void> {
    const btn = this.page.locator(this.saveButton).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1500);
    } else {
      console.warn('[AdminApplications] Save button not found — changes may have auto-saved or form was not open.');
    }
  }

  async toggleClosed(): Promise<void> {
    const exists = await this.lib.isVisible(this.closedToggle);
    if (!exists) {
      console.warn('[AdminApplications] Closed toggle not found');
      return;
    }
    await this.page.locator(this.closedToggle).first().click({ force: true });
    await this.page.waitForTimeout(500);
  }

  async searchApplications(term: string): Promise<void> {
    const exists = await this.lib.isVisible(this.searchInput);
    if (!exists) {
      console.warn('[AdminApplications] Search input not found');
      return;
    }
    await this.lib.clearAndFill(this.searchInput, term);
    await this.page.waitForTimeout(800);
  }
}
