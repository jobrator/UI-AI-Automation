import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminCandidatesPage — Page Object for the Admin Candidates management page.
 * URL: admin.jobrator.com/candidates
 */
export class AdminCandidatesPage extends BasePage {
  // ── Table ─────────────────────────────────────────────────────────────────
  private readonly table =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  // ── Columns ───────────────────────────────────────────────────────────────
  private readonly firstNameCol =
    'th:has-text("First"), th:has-text("first name"), th:has-text("First Name")';

  private readonly lastNameCol =
    'th:has-text("Last"), th:has-text("last name"), th:has-text("Last Name"), th:has-text("Surname")';

  private readonly genderCol =
    'th:has-text("Gender"), th:has-text("gender"), th:has-text("Sex")';

  private readonly phoneCol =
    'th:has-text("Phone"), th:has-text("phone"), th:has-text("Tel"), th:has-text("Mobile")';

  private readonly summaryCol =
    'th:has-text("Summary"), th:has-text("Career"), th:has-text("Objective"), th:has-text("Bio")';

  // ── Controls ──────────────────────────────────────────────────────────────
  private readonly viewButton =
    'button:has-text("View"), a:has-text("View"), [title="View"], .btn-view';

  private readonly createLink =
    'a:has-text("Create"), a:has-text("Add"), a:has-text("New Candidate"), button:has-text("Add New"), a[href*="new"]';

  private readonly saveButton =
    'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), input[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}candidates`);
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

  async hasFirstNameColumn(): Promise<boolean> {
    return this.lib.isVisible(this.firstNameCol);
  }

  async hasLastNameColumn(): Promise<boolean> {
    return this.lib.isVisible(this.lastNameCol);
  }

  async hasGenderColumn(): Promise<boolean> {
    return this.lib.isVisible(this.genderCol);
  }

  async hasPhoneColumn(): Promise<boolean> {
    return this.lib.isVisible(this.phoneCol);
  }

  async hasSummaryColumn(): Promise<boolean> {
    return this.lib.isVisible(this.summaryCol);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async clickView(index = 0): Promise<void> {
    const buttons = this.page.locator(this.viewButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminCandidates] No view buttons found');
      return;
    }
    await buttons.nth(index).click();
    await this.page.waitForTimeout(3000);
  }

  async clickCreateNew(): Promise<void> {
    const exists = await this.lib.isVisible(this.createLink);
    if (!exists) {
      const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
      await this.lib.navigateTo(`${adminUrl}actions/candidates/new`);
    } else {
      await this.lib.click(this.createLink);
    }
    await this.page.waitForTimeout(800);
  }

  async fillNewCandidateForm(): Promise<void> {
    const timestamp = Date.now();
    const firstNameField = 'input[name="firstName"], input[name="first_name"], input[placeholder*="first" i]';
    const lastNameField = 'input[name="lastName"], input[name="last_name"], input[placeholder*="last" i]';
    const emailField = 'input[name="email"], input[type="email"]';
    const phoneField = 'input[name="phone"], input[name="phoneNumber"], input[placeholder*="phone" i]';

    if (await this.lib.isVisible(firstNameField)) {
      await this.lib.clearAndFill(firstNameField, `TestFirst${timestamp}`);
    }
    if (await this.lib.isVisible(lastNameField)) {
      await this.lib.clearAndFill(lastNameField, `TestLast${timestamp}`);
    }
    if (await this.lib.isVisible(emailField)) {
      await this.lib.clearAndFill(emailField, `testcandidate${timestamp}@test.example.com`);
    }
    if (await this.lib.isVisible(phoneField)) {
      await this.lib.clearAndFill(phoneField, '+1234567890');
    }
  }

  async saveForm(): Promise<void> {
    const btn = this.page.locator(this.saveButton).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1500);
    } else {
      console.warn('[AdminCandidates] Save button not found — form may not be open or changes auto-saved.');
    }
  }
}
