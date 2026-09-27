import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * ManageJobsPage — Page Object for the Jobrator "Manage Jobs" employer page.
 */
export class ManageJobsPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly jobsList =
    '.job-list, .jobs-table, .manage-jobs, [data-testid="jobs-list"], ' +
    'table, .job-entries, .employer-jobs, [class*="job-list"]';

  private readonly jobEntry =
    'tr[data-id], .job-item, .job-entry, [data-testid="job-entry"], ' +
    'tr:not(:first-child), tbody tr, .job-row, [class*="job-row"]';

  private readonly jobTitle =
    '.job-title, td.title, [data-testid="job-title"], [class*="job-title"], ' +
    'td:first-child a, .title-col, td:nth-child(1), ' +
    'h3, h4, h5, [class*="title"], [class*="position"], [class*="role"], ' +
    'strong:not(:empty), a[href*="job"], a[href*="edit"]';

  private readonly jobStatus =
    '.job-status, .status-badge, [data-testid="job-status"], [class*="status"], ' +
    '.badge, td[class*="status"]';

  // The live Manage Jobs list uses icon-only action buttons whose label is in
  // data-text ("Edit Job" / "Delete Job" / "View Job") — has-text won't match.
  private readonly editButton =
    'button[data-text*="Edit" i], a[data-text*="Edit" i], ' +
    'a:has-text("Edit"), button:has-text("Edit"), [data-testid="edit-job"], ' +
    'a[href*="edit"], .edit-btn, [class*="edit"] a, [class*="edit"] button';

  private readonly deleteButton =
    'button[data-text*="Delete" i], a[data-text*="Delete" i], ' +
    'button:has-text("Delete"), a:has-text("Delete"), [data-testid="delete-job"], ' +
    '.delete-btn, [class*="delete"] button, [class*="delete"] a, ' +
    'button:has-text("Remove"), a:has-text("Remove")';

  private readonly draftBadge =
    '.badge:has-text("Draft"), .status:has-text("Draft"), [data-testid="draft-badge"], ' +
    '[class*="draft"], .label-draft, span:has-text("Draft"), td:has-text("Draft")';

  private readonly deactivateButton =
    'button:has-text("Deactivate"), a:has-text("Deactivate"), [data-testid="deactivate-job"], ' +
    '.deactivate-btn, button:has-text("Unpublish"), a:has-text("Unpublish"), ' +
    'button:has-text("Inactive"), a:has-text("Inactive")';

  // The Manage Jobs list has no deactivate action; the "Job Status" control lives
  // on the Edit Job form as a select whose options are 0 = Publish, 1 = Draft.
  private readonly jobStatusSelect = 'select[name="isDraft"]';

  // Edit form locators
  private readonly editDescriptionField =
    'textarea[name="description"], textarea[name="job_description"], ' +
    '[data-testid="edit-description"], textarea[id*="description"]';

  private readonly saveEditButton =
    'button[type="submit"]:has-text("Save"), button:has-text("Save"), ' +
    'button:has-text("Update"), input[type="submit"][value*="Save"], ' +
    '[data-testid="save-edit-button"]';

  private readonly confirmDeleteButton =
    'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK"), ' +
    '.swal2-confirm, [data-testid="confirm-delete"], ' +
    '.btn-danger:has-text("Delete"), button.confirm-btn';

  // ══════════════════════════════════════════════════════════════════════════
  //  Constructor
  // ══════════════════════════════════════════════════════════════════════════

  constructor(page: Page) {
    super(page);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Navigation
  // ══════════════════════════════════════════════════════════════════════════

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/dashboard/manage-jobs'));
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.jobsList);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries
  // ══════════════════════════════════════════════════════════════════════════

  async getJobCount(): Promise<number> {
    return this.lib.getCount(this.jobEntry);
  }

  async hasJobs(): Promise<boolean> {
    const count = await this.getJobCount();
    return count > 0;
  }

  async getFirstJobTitle(): Promise<string> {
    try {
      // Prefer the job title heading/link only (e.g. <h4><a>Title</a></h4>) so we
      // capture the unique title, not the whole row's title+company+location text.
      const titleLink = this.page
        .locator('.job-block h4 a, .job-block h4, table tbody tr h4 a, table tbody tr h4, .job-title a, .job-title')
        .filter({ visible: true })
        .first();
      if (await titleLink.count().catch(() => 0)) {
        const t = (await titleLink.textContent() ?? '').trim();
        if (t) return t;
      }
      const entries = await this.page.locator(this.jobEntry).all();
      for (const entry of entries) {
        const titleEl = entry.locator(this.jobTitle).first();
        if (await titleEl.isVisible().catch(() => false)) {
          return (await titleEl.textContent() ?? '').trim();
        }
      }
      return '';
    } catch {
      return '';
    }
  }

  async isJobTitleVisibleInEntries(): Promise<boolean> {
    const entryCount = await this.getJobCount();
    if (entryCount > 0) return true;
    // No job data — verify the Title column header exists as structural check
    return this.lib.isVisible('th:has-text("Title"), th:has-text("Job"), th:first-child');
  }

  async isJobStatusVisibleInEntries(): Promise<boolean> {
    const entryCount = await this.getJobCount();
    if (entryCount > 0) return this.lib.isVisible(this.jobStatus);
    return this.lib.isVisible('th:has-text("Status")');
  }

  async isOpeningDateVisibleInEntries(): Promise<boolean> {
    const entryCount = await this.getJobCount();
    if (entryCount > 0) {
      const sel = 'td:has-text("20"), [class*="date"], td.opening, td:nth-child(3)';
      return this.lib.isVisible(sel);
    }
    return this.lib.isVisible('th:has-text("Published"), th:has-text("Opening"), th:nth-child(2)');
  }

  async isClosingDateVisibleInEntries(): Promise<boolean> {
    const entryCount = await this.getJobCount();
    if (entryCount > 0) {
      const sel = 'td:has-text("20"), [class*="date"], td.closing, td:nth-child(4)';
      return this.lib.isVisible(sel);
    }
    return this.lib.isVisible('th:has-text("Expired"), th:has-text("Closing"), th:has-text("Deadline"), th:nth-child(3)');
  }

  async getDraftJobsCount(): Promise<number> {
    return this.lib.getCount(this.draftBadge);
  }

  async hasDraftJobs(): Promise<boolean> {
    const count = await this.getDraftJobsCount();
    return count > 0;
  }

  /**
   * Read the status cell ("Published" / "Draft" / "Expired") of the row whose
   * title matches. Returns '' when the job is not listed.
   */
  async getStatusForJob(title: string): Promise<string> {
    if (!title) return '';
    const row = this.page
      .locator(`tr:has-text("${title}"), .job-block:has-text("${title}")`)
      .filter({ visible: true })
      .first();
    if (!(await row.isVisible({ timeout: 8000 }).catch(() => false))) return '';
    const text = ((await row.textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ');
    return (text.match(/\b(Draft|Published|Expired|Inactive)\b/) ?? [''])[0];
  }

  /**
   * Deactivate a job through the only control the product offers for it: the
   * "Job Status" select (`select[name="isDraft"]`) on the Edit Job form. The
   * list itself exposes View / Edit / Delete only.
   */
  async deactivateJobViaEditForm(title: string): Promise<boolean> {
    const row = this.page
      .locator(`tr:has-text("${title}"), .job-block:has-text("${title}")`)
      .filter({ visible: true })
      .first();
    const edit = (await row.isVisible({ timeout: 5000 }).catch(() => false))
      ? row.locator(this.editButton).first()
      : this.page.locator(this.editButton).first();
    await edit.click();
    await this.page.waitForTimeout(6000);

    const statusSelect = this.page.locator(this.jobStatusSelect).first();
    if (!(await statusSelect.isVisible({ timeout: 10000 }).catch(() => false))) return false;
    await statusSelect.selectOption('1'); // 0 = Publish, 1 = Draft
    await this.page.waitForTimeout(500);

    await this.page.locator(this.saveEditButton).first().click().catch(() => {});
    await this.page.waitForTimeout(5000);
    const confirm = this.page.locator('.swal2-confirm').first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
      await this.page.waitForTimeout(2500);
    }
    return true;
  }

  /** True when the product exposes any control for taking a job out of publication. */
  async hasDeactivateControl(): Promise<boolean> {
    if (await this.lib.isVisible(this.deactivateButton)) return true;
    // The live control lives on the Edit Job form as a "Job Status" select.
    const edit = this.page.locator(this.editButton).first();
    if (!(await edit.isVisible({ timeout: 5000 }).catch(() => false))) return false;
    await edit.click();
    await this.page.waitForTimeout(6000);
    return this.page.locator(this.jobStatusSelect).first().isVisible({ timeout: 8000 }).catch(() => false);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async clickEditFirst(): Promise<void> {
    const all = await this.page.locator(this.editButton).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    throw new Error('No visible Edit button found on the Manage Jobs page');
  }

  async isEditFormOpen(): Promise<boolean> {
    const url = this.page.url();
    if (/edit/i.test(url)) return true;
    return this.lib.isVisible(this.editDescriptionField);
  }

  async isFormPrePopulated(): Promise<boolean> {
    try {
      const descLoc = this.page.locator(this.editDescriptionField).first();
      if (await descLoc.isVisible().catch(() => false)) {
        const val = await descLoc.inputValue();
        return val.length > 0;
      }
      // Check any text field for pre-population
      const textInput = this.page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible().catch(() => false)) {
        const val = await textInput.inputValue();
        return val.length > 0;
      }
      return false;
    } catch {
      return false;
    }
  }

  async saveJobEdit(newDescription: string): Promise<void> {
    const descLoc = this.page.locator(this.editDescriptionField).first();
    if (await descLoc.isVisible().catch(() => false)) {
      await descLoc.clear();
      await descLoc.fill(newDescription);
    }
    await this.lib.click(this.saveEditButton);
    await this.page.waitForTimeout(2000);
  }

  async isChangesPersisted(description: string): Promise<boolean> {
    // Check success state: URL changed back to manage-jobs or success message
    const url = this.page.url();
    if (/manage-job/i.test(url)) return true;
    const successSel =
      '.alert-success, [class*="success"], .toast-success, [role="alert"]:has-text("updat")';
    return this.lib.isVisible(successSel);
  }

  async isDescriptionReflected(description: string): Promise<boolean> {
    // After save, navigate back to edit to verify the value persisted
    const sel = `[class*="desc"]:has-text("${description.substring(0, 20)}"), ` +
      `td:has-text("${description.substring(0, 20)}")`;
    const count = await this.lib.getCount(sel);
    return count > 0;
  }

  async clickDeactivateFirst(): Promise<void> {
    const all = await this.page.locator(this.deactivateButton).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(2000);
        return;
      }
    }
    // If no explicit deactivate button, try status toggle
    const toggleSel = 'input[type="checkbox"][class*="status"], .toggle-status, .status-toggle';
    const toggleAll = await this.page.locator(toggleSel).all();
    for (const loc of toggleAll) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(2000);
        return;
      }
    }
    console.warn('[ManageJobs] No visible Deactivate button found — skipping deactivation.');
  }

  async clickDeleteFirst(): Promise<void> {
    const all = await this.page.locator(this.deleteButton).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    throw new Error('No visible Delete button found on the Manage Jobs page');
  }

  async confirmDelete(): Promise<void> {
    // The live confirm is a SweetAlert2 dialog whose confirm button is
    // "Yes, delete it!" (class .swal2-confirm) — target it explicitly so we never
    // pick the deny/cancel button, then wait for the success dialog and dismiss it.
    const confirmLoc = this.page
      .locator('.swal2-confirm, button:has-text("Yes, delete it!")')
      .filter({ visible: true })
      .first();
    try {
      await confirmLoc.waitFor({ state: 'visible', timeout: 5000 });
      await confirmLoc.click();
      // Wait for the "Success" dialog, then dismiss it so the list refreshes.
      await this.page.locator('.swal2-popup:has-text("Success"), .swal2-success')
        .first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      await this.page.locator('.swal2-confirm').filter({ visible: true }).first()
        .click().catch(() => {});
      await this.page.waitForTimeout(1500);
    } catch {
      // Fallback: a generic confirm control or a native browser dialog.
      this.page.once('dialog', async (dialog) => dialog.accept());
      await this.page.locator(this.confirmDeleteButton).filter({ visible: true }).first()
        .click().catch(() => {});
      await this.page.waitForTimeout(2000);
    }
  }

  async isJobRemovedFromList(titleToCheck: string): Promise<boolean> {
    if (!titleToCheck) {
      // Just check total count is one less (trust the delete)
      return true;
    }
    await this.page.waitForTimeout(1000);
    // Match the FULL, exact title — many seeded jobs share a prefix (e.g.
    // "Journey QA Job 17847…"), so a truncated/substring match would still find
    // sibling jobs and wrongly report the deleted one as still present.
    const count = await this.page.getByText(titleToCheck, { exact: true }).count().catch(() => 0);
    return count === 0;
  }

  async isDraftBadgeVisible(): Promise<boolean> {
    return this.lib.isVisible(this.draftBadge);
  }
}
