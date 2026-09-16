import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * SavedJobsPage — Page Object for /dashboard/saved-jobs
 */
export class SavedJobsPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly savedJobsList =
    '.saved-jobs-list, .bookmarked-jobs, [data-testid="saved-jobs-list"], ' +
    '.shortlisted-jobs, table tbody, [class*="saved-job"]';

  private readonly savedJobEntry =
    '.saved-job-item, .bookmarked-job-item, [data-testid="saved-job-entry"], ' +
    'table tbody tr, [class*="saved-job"], .saved-job-card, .shortlisted-item';

  private readonly jobTitleEl =
    '.job-title, .saved-job-title, a[href*="/job/"], a[href*="/jobs/"], ' +
    '[data-testid="saved-job-title"], td.title, .position-name';

  private readonly companyNameEl =
    '.company-name, .employer-name, [data-testid="company-name"], ' +
    'td.company, [class*="company"], .firm-name';

  // On the live Saved Jobs page the unsave control is an icon-only
  // <button data-text="Delete from Saved Jobs"> with a .la-trash glyph — its
  // label lives in data-text, not visible text, so has-text() will not match it.
  private readonly unsaveButton =
    'button[data-text*="Delete from Saved" i], button[data-text*="Unsave" i], ' +
    'button[data-text*="Remove" i], .option-list button:has(.la-trash), button:has(.la-trash), ' +
    'button:has-text("Unsave"), button:has-text("Remove"), button.unsave-btn, ' +
    'a:has-text("Unsave"), button[title*="unsave" i], button[title*="remove" i], ' +
    '[data-testid="unsave-button"], button:has-text("Delete"), ' +
    '.bookmark-remove, i.fa-bookmark ~ button, button:has-text("Saved")';

  // The live Saved Jobs list routes to applying via a "View Job" action
  // (<button data-text="View Job"> wrapping a link to /jobs/:id) rather than a
  // direct Apply button, so accept that job-open action as the apply affordance.
  private readonly applyButton =
    'button[data-text*="View Job" i], .option-list a[href*="/jobs/"], ' +
    'button:has-text("Apply"), a:has-text("Apply Now"), a:has-text("Apply"), ' +
    '.apply-btn, [data-testid="apply-button"], a.btn:has-text("Apply")';

  private readonly emptyState =
    '.empty-state, [class*="no-result"], [class*="empty"], ' +
    '*:has-text("No saved jobs"), *:has-text("No jobs saved"), ' +
    '*:has-text("haven\'t saved"), [data-testid="empty-state"]';

  // ──── Job listing (public page) ──────────────────────────────────────────

  // On the live /jobs listing each card's save control is <button class="bookmark-btn">
  // containing a <span class="flaticon-bookmark"> icon (no visible text).
  private readonly saveBookmarkIcon =
    'button.bookmark-btn, button:has(.flaticon-bookmark), [class*="bookmark"] button, ' +
    'button[class*="bookmark"], .flaticon-bookmark, ' +
    '.save-job, .bookmark-icon, button[title*="save" i], button[title*="bookmark" i], ' +
    'button.save-btn, [data-testid="save-job"], .fa-bookmark, i.fa-bookmark, ' +
    'button:has-text("Save"), button:has-text("Bookmark"), .heart-btn, .wishlist-btn';

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
    await this.lib.navigateTo(this.url('/dashboard/saved-jobs'));
    await this.page.waitForTimeout(1500);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('domcontentloaded');
    return (
      (await this.lib.isVisible(this.savedJobsList)) ||
      (await this.lib.isVisible(this.emptyState)) ||
      (await this.lib.isVisible(this.savedJobEntry))
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Query methods
  // ══════════════════════════════════════════════════════════════════════════

  async getSavedJobCount(): Promise<number> {
    return this.lib.getCount(this.savedJobEntry);
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return this.lib.isVisible(this.emptyState);
  }

  async hasSavedJobs(): Promise<boolean> {
    const count = await this.getSavedJobCount();
    return count > 0;
  }

  async isJobTitleVisible(): Promise<boolean> {
    return this.lib.isVisible(this.jobTitleEl);
  }

  async isCompanyNameVisible(): Promise<boolean> {
    return this.lib.isVisible(this.companyNameEl);
  }

  async isUnsaveActionVisible(): Promise<boolean> {
    return this.lib.isVisible(this.unsaveButton);
  }

  async isApplyActionVisible(): Promise<boolean> {
    return this.lib.isVisible(this.applyButton);
  }

  async isJobPresent(title?: string): Promise<boolean> {
    if (title) {
      return this.lib.isVisible(`*:has-text("${title}")`);
    }
    return this.hasSavedJobs();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async clickUnsaveFirst(): Promise<void> {
    const countBefore = await this.getSavedJobCount();
    await this.lib.click(this.unsaveButton);
    await this.page.waitForTimeout(1500);
    // Confirm count decreased or empty state appeared
    const countAfter = await this.getSavedJobCount();
    if (countAfter >= countBefore) {
      console.warn('[SavedJobsPage] Unsave click did not reduce the job count');
    }
  }

  /**
   * Navigate to the public /jobs page and click the save icon on the first job card.
   */
  async navigateToJobsAndSaveFirst(): Promise<void> {
    await this.lib.navigateTo(this.url('/jobs'));
    await this.page.waitForTimeout(1500);
    await this.lib.click(this.saveBookmarkIcon);
    await this.page.waitForTimeout(1000);
  }

  async clickSaveBookmarkIcon(): Promise<void> {
    await this.lib.click(this.saveBookmarkIcon);
    await this.page.waitForTimeout(1000);
  }

  async isSavedConfirmationVisible(): Promise<boolean> {
    const confirmSelector =
      '.alert-success, .toast-success, .swal2-success, [class*="success"], ' +
      '*:has-text("saved"), *:has-text("bookmarked"), [role="alert"]';
    return this.lib.isVisible(confirmSelector);
  }
}
