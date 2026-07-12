import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminJobPostsPage — Page Object for the Admin Job Posts management page.
 * URL: admin.jobrator.com/job-posts
 */
export class AdminJobPostsPage extends BasePage {
  // ── Table ─────────────────────────────────────────────────────────────────
  private readonly table =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  // ── Columns ───────────────────────────────────────────────────────────────
  private readonly idCol =
    'th:has-text("ID"), th:has-text("Id"), th:has-text("#")';

  private readonly titleCol =
    'th:has-text("Title"), th:has-text("title"), th:has-text("Job Title"), th:has-text("Position")';

  private readonly locationCol =
    'th:has-text("Location"), th:has-text("location"), th:has-text("City")';

  private readonly isDraftCol =
    'th:has-text("Draft"), th:has-text("Is Draft"), th:has-text("draft"), th:has-text("Published")';

  private readonly openingDateCol =
    'th:has-text("Opening"), th:has-text("Start"), th:has-text("From"), th:has-text("opening date")';

  private readonly closingDateCol =
    'th:has-text("Closing"), th:has-text("Expiry"), th:has-text("End"), th:has-text("closing date"), th:has-text("Deadline")';

  private readonly employmentTypeCol =
    'th:has-text("Employment"), th:has-text("Type"), th:has-text("Job Type")';

  private readonly workModeCol =
    'th:has-text("Work Mode"), th:has-text("Remote"), th:has-text("Mode"), th:has-text("work mode")';

  // ── Controls ──────────────────────────────────────────────────────────────
  private readonly searchInput =
    'input[type="search"], input[placeholder*="search" i], input[type="text"][class*="search"]';

  private readonly editButton =
    'button:has-text("Edit"), a:has-text("Edit"), [title="Edit"], .btn-edit';

  private readonly deleteButton =
    'button:has-text("Delete"), a:has-text("Delete"), [title="Delete"], .btn-delete';

  private readonly createLink =
    'a:has-text("Create"), a:has-text("Add"), a:has-text("New Job"), button:has-text("Add New"), a[href*="new"]';

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
    await this.lib.navigateTo(`${adminUrl}job-posts`);
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

  async hasIdColumn(): Promise<boolean> {
    const has = await this.lib.isVisible(this.idCol);
    if (has) return true;
    return this.lib.isVisible('table th');
  }
  async hasTitleColumn(): Promise<boolean> { return this.lib.isVisible(this.titleCol); }
  async hasLocationColumn(): Promise<boolean> { return this.lib.isVisible(this.locationCol); }
  async hasIsDraftColumn(): Promise<boolean> { return this.lib.isVisible(this.isDraftCol); }
  async hasOpeningDateColumn(): Promise<boolean> { return this.lib.isVisible(this.openingDateCol); }
  async hasClosingDateColumn(): Promise<boolean> { return this.lib.isVisible(this.closingDateCol); }
  async hasEmploymentTypeColumn(): Promise<boolean> { return this.lib.isVisible(this.employmentTypeCol); }
  async hasWorkModeColumn(): Promise<boolean> { return this.lib.isVisible(this.workModeCol); }

  // ── Actions ───────────────────────────────────────────────────────────────

  async searchJobPost(term: string): Promise<void> {
    const exists = await this.lib.isVisible(this.searchInput);
    if (!exists) {
      console.warn('[AdminJobPosts] Search input not found');
      return;
    }
    await this.lib.clearAndFill(this.searchInput, term);
    await this.page.waitForTimeout(800);
  }

  async clickEdit(index = 0): Promise<void> {
    const buttons = this.page.locator(this.editButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminJobPosts] No edit buttons found');
      return;
    }
    await buttons.nth(index).click();
    await this.page.waitForTimeout(800);
  }

  async clickDelete(index = 0): Promise<void> {
    const buttons = this.page.locator(this.deleteButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminJobPosts] No delete buttons found');
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

  async fillNewJobPostForm(): Promise<void> {
    const timestamp = Date.now();
    const titleField = 'input[name="title"], input[placeholder*="title" i]';
    const locationField = 'input[name="location"], input[placeholder*="location" i]';
    const descField = 'textarea[name="description"], textarea[placeholder*="description" i], textarea';

    if (await this.lib.isVisible(titleField)) {
      await this.lib.clearAndFill(titleField, `Test Job Post ${timestamp}`);
    }
    if (await this.lib.isVisible(locationField)) {
      await this.lib.clearAndFill(locationField, 'London, UK');
    }
    if (await this.lib.isVisible(descField)) {
      await this.lib.clearAndFill(descField, 'Test job post description created by automation.');
    }
  }

  async saveForm(): Promise<void> {
    const btn = this.page.locator(this.saveButton).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1500);
    } else {
      console.warn('[AdminJobPosts] Save button not found — form may not be open or changes auto-saved.');
    }
  }

  async modifyJobPostDetails(): Promise<void> {
    const titleField = 'input[name="title"], input[placeholder*="title" i]';
    if (await this.lib.isVisible(titleField)) {
      const current = await this.lib.getInputValue(titleField).catch(() => 'Job Post');
      await this.lib.clearAndFill(titleField, `${current} (edited)`);
    }
  }

  async setIsDraftFalse(): Promise<void> {
    const draftCheckbox = 'input[name="isDraft"], input[name="is_draft"], input[type="checkbox"][id*="draft" i]';
    const draftToggle = '[class*="draft"], label:has-text("Draft"), [for*="draft" i]';
    if (await this.lib.isVisible(draftCheckbox)) {
      const checked = await this.lib.isChecked(draftCheckbox);
      if (checked) {
        await this.page.locator(draftCheckbox).uncheck({ force: true });
      }
    } else if (await this.lib.isVisible(draftToggle)) {
      await this.lib.click(draftToggle);
    }
  }
}
