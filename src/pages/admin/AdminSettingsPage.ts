import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminSettingsPage — Page Object for the Admin System Settings management page.
 * URL: admin.jobrator.com/settings
 */
export class AdminSettingsPage extends BasePage {
  // ── Table ─────────────────────────────────────────────────────────────────
  private readonly table =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  // ── Columns ───────────────────────────────────────────────────────────────
  private readonly idCol =
    'th:has-text("ID"), th:has-text("Id"), th:has-text("#")';

  private readonly nameCol =
    'th:has-text("Name"), th:has-text("Key"), th:has-text("Setting")';

  private readonly valueCol =
    'th:has-text("Value"), th:has-text("Current Value"), th:has-text("Current")';

  private readonly defaultCol =
    'th:has-text("Default"), th:has-text("default"), th:has-text("Default Value")';

  // ── Controls ──────────────────────────────────────────────────────────────
  private readonly editButton =
    'button:has-text("Edit"), a:has-text("Edit"), [title="Edit"], .btn-edit';

  private readonly createLink =
    'a:has-text("Create"), a:has-text("Add"), a:has-text("New Setting"), button:has-text("Add New"), a[href*="new"]';

  private readonly saveButton =
    'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), input[type="submit"]';

  private readonly valueInput =
    'input[name="value"], input[name="currentValue"], input[placeholder*="value" i], textarea[name="value"]';

  private readonly nameInput =
    'input[name="name"], input[name="key"], input[placeholder*="name" i], input[placeholder*="key" i]';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}settings`);
    await this.page.waitForTimeout(3000);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector('table, tr, [class*="table__"]', { timeout: 8000 }).catch(() => {});
    return this.lib.isVisible(this.table);
  }

  // ── State queries ─────────────────────────────────────────────────────────

  async getRowCount(): Promise<number> {
    return this.lib.getCount(this.tableRows);
  }

  async hasIdColumn(): Promise<boolean> { return this.lib.isVisible(this.idCol); }
  async hasNameColumn(): Promise<boolean> { return this.lib.isVisible(this.nameCol); }
  async hasValueColumn(): Promise<boolean> { return this.lib.isVisible(this.valueCol); }
  async hasDefaultColumn(): Promise<boolean> { return this.lib.isVisible(this.defaultCol); }

  // ── Actions ───────────────────────────────────────────────────────────────

  async clickEdit(index = 0): Promise<void> {
    const buttons = this.page.locator(this.editButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminSettings] No edit buttons found');
      return;
    }
    await buttons.nth(index).click();
    await this.page.waitForTimeout(800);
  }

  async changeValue(newValue: string): Promise<void> {
    const exists = await this.lib.isVisible(this.valueInput);
    if (!exists) {
      console.warn('[AdminSettings] Value input not found');
      return;
    }
    await this.lib.clearAndFill(this.valueInput, newValue);
  }

  async saveEdit(): Promise<void> {
    const btn = this.page.locator(this.saveButton).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1500);
    } else {
      console.warn('[AdminSettings] Save button not found — form may not be open or changes auto-saved.');
    }
  }

  async clickCreateNew(): Promise<void> {
    const exists = await this.lib.isVisible(this.createLink);
    if (!exists) {
      const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
      await this.lib.navigateTo(`${adminUrl}actions/settings/new`);
    } else {
      await this.lib.click(this.createLink);
    }
    await this.page.waitForTimeout(800);
  }

  async fillNewSetting(name: string, value: string): Promise<void> {
    if (await this.lib.isVisible(this.nameInput)) {
      await this.lib.clearAndFill(this.nameInput, name);
    }
    if (await this.lib.isVisible(this.valueInput)) {
      await this.lib.clearAndFill(this.valueInput, value);
    }
  }
}
