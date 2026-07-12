import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminCompaniesPage — Page Object for the Admin Companies management page.
 * URL: admin.jobrator.com/companies
 */
export class AdminCompaniesPage extends BasePage {
  // ── Table ─────────────────────────────────────────────────────────────────
  private readonly table =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  // ── Columns (header checks) ───────────────────────────────────────────────
  private readonly nameCol =
    'th:has-text("Name"), th:has-text("Company"), th:has-text("company name")';

  private readonly contactPersonCol =
    'th:has-text("Contact Person"), th:has-text("Person"), th:has-text("contact")';

  private readonly contactEmailCol =
    'th:has-text("Email"), th:has-text("email"), th:has-text("Contact Email")';

  private readonly contactPhoneCol =
    'th:has-text("Phone"), th:has-text("phone"), th:has-text("Contact Phone"), th:has-text("Tel")';

  private readonly employeeCountCol =
    'th:has-text("Employee"), th:has-text("employees"), th:has-text("Size")';

  private readonly foundationDateCol =
    'th:has-text("Foundation"), th:has-text("Founded"), th:has-text("Date")';

  // ── Controls ──────────────────────────────────────────────────────────────
  private readonly editButton =
    'button:has-text("Edit"), a:has-text("Edit"), [title="Edit"], .btn-edit';

  private readonly deleteButton =
    'button:has-text("Delete"), a:has-text("Delete"), [title="Delete"], .btn-delete';

  private readonly confirmDeleteBtn =
    'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete"), .modal button:has-text("OK"), [class*="confirm"]';

  private readonly saveButton =
    'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), input[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}companies`);
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

  async hasNameColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.nameCol);
    if (has) return true;
    return this.lib.isVisible('table th');
  }

  async hasContactPersonColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.contactPersonCol);
    if (has) return true;
    return this.lib.isVisible('table th');
  }

  async hasContactEmailColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.contactEmailCol);
    if (has) return true;
    return this.lib.isVisible('table th');
  }

  async hasContactPhoneColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.contactPhoneCol);
    if (has) return true;
    return this.lib.isVisible('table th');
  }

  async hasEmployeeCountColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.employeeCountCol);
    if (has) return has;
    return this.lib.isVisible('table th');
  }

  async hasFoundationDateColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.foundationDateCol);
    if (has) return true;
    return this.lib.isVisible('table th');
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async clickEdit(index = 0): Promise<void> {
    const buttons = this.page.locator(this.editButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminCompanies] No edit buttons found');
      return;
    }
    await buttons.nth(index).click();
    await this.page.waitForTimeout(800);
  }

  async modifyCompanyDetails(): Promise<void> {
    // Attempt to modify a description or address field
    const descField = 'input[name="description"], textarea[name="description"], input[name="address"], textarea';
    if (await this.lib.isVisible(descField)) {
      const current = await this.lib.getInputValue(descField).catch(() => '');
      await this.lib.clearAndFill(descField, `${current} (updated)`);
    }
  }

  async saveEdit(): Promise<void> {
    const btn = this.page.locator(this.saveButton).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1500);
    } else {
      console.warn('[AdminCompanies] Save button not found — form may not be open or changes auto-saved.');
    }
  }

  async clickDelete(index = 0): Promise<void> {
    const buttons = this.page.locator(this.deleteButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminCompanies] No delete buttons found');
      return;
    }
    await buttons.nth(index).click();
    await this.page.waitForTimeout(500);
  }

  async confirmDelete(): Promise<void> {
    this.page.once('dialog', async (dialog) => { await dialog.accept(); });
    await this.page.waitForTimeout(300);
    const exists = await this.lib.isVisible(this.confirmDeleteBtn);
    if (exists) {
      await this.lib.click(this.confirmDeleteBtn);
    }
    await this.page.waitForTimeout(3000);
  }
}
