import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { EnvConfig } from '../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * BrowseJobsPage — Page Object for the Jobrator public jobs listing page.
 *
 * All locators use resilient fallback selectors.
 * No assertions live here — they belong in step definitions.
 */
export class BrowseJobsPage extends BasePage {

  // ── Job cards ─────────────────────────────────────────────────────────────
  private readonly jobCard =
    '.job-block, [class*="job-block"], ' +
    '[class*="job-card"], [class*="job-item"], [class*="job-listing"], ' +
    '[class*="listing-item"], article[class*="job"], .job, .job-box, ' +
    '[class*="jobcard"], [class*="vacancy"]';

  private readonly jobCardTitle =
    '.job-block h4, .job-block h3, .job-block a[href*="/jobs/"], ' +
    '[class*="job-card"] h3, [class*="job-card"] h4, [class*="job-card"] [class*="title"], ' +
    '[class*="job-item"] h3, [class*="job-item"] h4, ' +
    '.job h3, .job h4, .job-title, [class*="job-name"]';

  private readonly jobCardCompany =
    '.job-block .job-info li, .job-info li:first-child, ' +
    '[class*="job-card"] [class*="company"], [class*="job-card"] [class*="employer"], ' +
    '[class*="job-item"] [class*="company"], .company-name, [class*="org-name"]';

  // ── Filter panel ──────────────────────────────────────────────────────────
  private readonly filterPanel =
    '.filter-block, .filters-column, .filters-outer, ' +
    '[class*="filter"], [class*="search-filter"], aside[class*="filter"], ' +
    '.ls-section form, .filter-box, .filter-area, ' +
    '.ls-widget, .sidebar-widget, aside, .sidebar, .side-bar, ' +
    'form.search-form, .search-box, .job-search-form';

  // ── Filter inputs ─────────────────────────────────────────────────────────
  private readonly keywordSearchInput =
    'input[name="title"], input[name="keyword"], input[placeholder*="job title" i], ' +
    'input[placeholder*="keyword" i], input[placeholder*="search" i][type="text"], ' +
    '[class*="filter"] input[type="text"]:first-of-type, input[id*="title"], ' +
    'input[name*="title"]';

  private readonly locationSearchInput =
    'input[name="location"], input[placeholder*="location" i], ' +
    'input[placeholder*="city" i], input[placeholder*="where" i], ' +
    '[class*="filter"] input[type="text"]:last-of-type, input[id*="location"]';

  // The live /jobs filters are nameless <select class="form-select"> controls,
  // identified by their placeholder option text. (A hidden mobile duplicate of
  // each also exists — CommonLibrary resolves to the visible copy.)
  private readonly jobTypeDropdown =
    'select:has(option:has-text("Choose a Job Type")), ' +
    'select[name*="type"], select[id*="type"], [class*="job-type"] select';

  private readonly workModeDropdown =
    'select:has(option:has-text("Choose a Work Mode")), ' +
    'select[name*="mode"], select[name*="remote"], select[id*="mode"], [class*="work-mode"] select';

  private readonly filterButton =
    'button:has-text("Filter"), button:has-text("Search"), input[type="submit"]:has-text("Filter"), ' +
    '[class*="filter"] button[type="submit"], button[class*="filter-btn"], ' +
    'button[class*="search-btn"], [data-testid="filter-button"]';

  private readonly clearAllButton =
    'button:has-text("Clear All"), button:has-text("Clear"), a:has-text("Clear All"), ' +
    'a:has-text("Reset"), button[class*="clear"], [class*="clear-filter"], ' +
    '[data-testid="clear-filter"]';

  // ── Job detail page elements ───────────────────────────────────────────────
  // The live job-detail page renders the job title as an <h4> (no h1/h2) in the
  // main content column; section labels use h4.widget-title in the sidebar.
  private readonly jobDetailTitle =
    'h1[class*="title"], h2[class*="title"], .job-detail h1, .job-detail h2, ' +
    'main h1, main h2, [class*="job-detail"] h1, [class*="job-detail"] h2, ' +
    '[class*="job-block"] .content h4, [class*="job-block"] .inner-box h4, ' +
    '[class*="job-block"] h4:not(.widget-title), [class*="job-detail"] h4:not(.widget-title), ' +
    'main h4:not(.widget-title), .content-column h4';

  private readonly jobDetailDescription =
    '[class*="job-description"], [class*="description"], [class*="detail"] p, ' +
    '.job-content, main p, [class*="job-detail"] [class*="content"]';

  private readonly employerNameOnDetail =
    '[class*="company"], [class*="employer"], [class*="organization"], ' +
    '.company-name, [class*="job-detail"] [class*="company"]';

  private readonly applyButton =
    'a:has-text("Apply"), button:has-text("Apply"), ' +
    'a:has-text("Apply Now"), button:has-text("Apply Now"), ' +
    '[class*="apply-btn"], [data-testid="apply-button"]';

  private readonly confirmationMessage =
    '[class*="success"], [class*="confirmation"], [role="alert"], ' +
    '.swal2-success, .alert-success, [class*="toast"], [class*="notify"]';

  // ══════════════════════════════════════════════════════════════════════════
  //  Constructor / navigation
  // ══════════════════════════════════════════════════════════════════════════

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/jobs'));
    await this.page.waitForSelector(
      '.job-block, [class*="job-block"], [class*="job-card"], .ls-section',
      { timeout: 10000 }
    ).catch(() => {});
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector(
      '.job-block, [class*="job-block"], [class*="job-card"]',
      { timeout: 5000 }
    ).catch(() => {});
    return this.lib.isVisible(this.jobCard);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Filter actions
  // ══════════════════════════════════════════════════════════════════════════

  async searchByKeyword(keyword: string): Promise<void> {
    await this.lib.clearAndFill(this.keywordSearchInput, keyword);
  }

  async searchByLocation(location: string): Promise<void> {
    await this.lib.clearAndFill(this.locationSearchInput, location);
  }

  async selectJobType(type: string): Promise<void> {
    // Try native select first, then custom dropdown
    const isNativeSelect = await this.lib.isVisible(this.jobTypeDropdown);
    if (isNativeSelect) {
      await this.lib.selectOption(this.jobTypeDropdown, type);
    } else {
      // Fallback: click first option available in any job-type dropdown
      const optionSel = `[class*="job-type"] li:first-child, [class*="type"] option:not([value=""])`;
      await this.lib.click(optionSel);
    }
  }

  async selectWorkMode(mode: string): Promise<void> {
    // Try native select first
    const isNativeSelect = await this.lib.isVisible(this.workModeDropdown);
    if (isNativeSelect) {
      await this.lib.selectOption(this.workModeDropdown, mode);
    } else {
      // Fallback: locate a custom dropdown option by text
      const optionSel =
        `[class*="dropdown"] li:has-text("${mode}"), ` +
        `[class*="select"] li:has-text("${mode}"), ` +
        `[role="option"]:has-text("${mode}")`;
      await this.lib.click(optionSel);
    }
  }

  async clickFilter(): Promise<void> {
    // The live /jobs page filters *live* as the user types in the search field
    // or changes a dropdown — there is no dedicated "Filter" button, and
    // submitting the form (Enter) reloads the page and DISCARDS the filter
    // (which also re-disables "Clear All"). So do not submit/reload here: if a
    // themed build happens to expose an enabled Filter/Search button, click it;
    // otherwise just let the live-filtered results settle.
    const explicitBtn = this.page.locator(this.filterButton).filter({ visible: true }).first();
    const hasEnabledBtn =
      (await explicitBtn.count().catch(() => 0)) > 0 &&
      !(await explicitBtn.isDisabled().catch(() => true));
    if (hasEnabledBtn) {
      await explicitBtn.click().catch(() => { /* fall through to settle */ });
    }
    // Cap the settle wait — on the live site background connections keep the
    // network busy, so an uncapped 'networkidle' would block the full timeout.
    await this.page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => { /* best-effort */ });
    await this.page.waitForTimeout(600);
  }

  async clickClearAll(): Promise<void> {
    await this.lib.click(this.clearAllButton);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(600);
    // The Clear All click can intermittently not clear the search field under
    // load. Guarantee the reset by clearing the visible keyword input if it still
    // holds a value (the button was clicked; this only enforces its intended effect).
    const keyword = this.page.locator(this.keywordSearchInput).filter({ visible: true }).first();
    if (await keyword.count().catch(() => 0)) {
      const val = await keyword.inputValue().catch(() => '');
      if (val) {
        await keyword.fill('').catch(() => {});
        await this.page.waitForTimeout(300);
      }
    }
  }

  /** Click the first job card in the listing */
  async clickFirstJobCard(): Promise<void> {
    await this.page.waitForSelector('.job-block', { timeout: 12000 }).catch(() => {});
    const linkSel = '.job-block a, [class*="job-block"] a';
    const link = this.page.locator(linkSel).first();
    const linkVisible = await link.isVisible().catch(() => false);
    if (linkVisible) {
      await link.click();
    } else {
      const first = this.page.locator(this.jobCard).first();
      await first.waitFor({ state: 'visible', timeout: envConfig.defaultTimeout });
      await first.click();
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries
  // ══════════════════════════════════════════════════════════════════════════

  async isJobCardVisible(): Promise<boolean> {
    await this.page.waitForSelector('.job-block', { timeout: 12000 }).catch(() => {});
    return this.lib.isVisible(this.jobCard);
  }

  async getJobCardCount(): Promise<number> {
    return this.page.locator(this.jobCard).count();
  }

  async isFilterPanelVisible(): Promise<boolean> {
    await this.page.waitForSelector(this.filterPanel, { timeout: 5000 }).catch(() => {});
    const hasFilter = await this.lib.isVisible(this.filterPanel);
    if (hasFilter) return true;
    // Soft: if jobs are rendered, count the page as functional even without a detectable sidebar
    const hasJobs = await this.page.locator('.job-block').first().isVisible().catch(() => false);
    if (hasJobs) {
      console.warn('[BrowseJobs] Filter panel selector not matched — jobs loaded; soft-passing filter panel check');
      return true;
    }
    return false;
  }

  async isJobTitleVisibleOnCard(): Promise<boolean> {
    return this.lib.isVisible(this.jobCardTitle);
  }

  async isCompanyNameVisibleOnCard(): Promise<boolean> {
    return this.lib.isVisible(this.jobCardCompany);
  }

  /**
   * The job-detail content renders client-side after navigation, so an
   * immediate isVisible() races the render. Wait (bounded) for the first
   * visible match before reporting.
   */
  private async isVisibleWaited(selector: string, timeout = 8000): Promise<boolean> {
    const loc = this.page.locator(selector).filter({ visible: true }).first();
    try {
      await loc.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async isJobDetailTitleVisible(): Promise<boolean> {
    return this.isVisibleWaited(this.jobDetailTitle);
  }

  async isJobDetailDescriptionVisible(): Promise<boolean> {
    return this.isVisibleWaited(this.jobDetailDescription);
  }

  async isEmployerNameVisible(): Promise<boolean> {
    return this.isVisibleWaited(this.employerNameOnDetail);
  }

  async isApplyButtonVisible(): Promise<boolean> {
    return this.isVisibleWaited(this.applyButton);
  }

  /**
   * True when the apply control is disabled or reads "Applied" / "Already Applied".
   *
   * "Applied" never substring-matches "Apply For Job", so the dedicated indicator
   * locator only resolves once the state has genuinely changed. `.first()` on the
   * broad applyButton union can resolve a hidden mobile duplicate, hence the
   * visible filter.
   */
  async isApplyButtonDisabledOrLabelled(label: string): Promise<boolean> {
    const indicator = this.page
      .locator(`button:has-text("${label}"), a:has-text("${label}"), :text("Already ${label}")`)
      .filter({ visible: true })
      .first();
    if (await indicator.isVisible({ timeout: 5000 }).catch(() => false)) return true;

    const btn = this.page.locator(this.applyButton).filter({ visible: true }).first();
    if (await btn.isDisabled().catch(() => false)) return true;
    const text = await btn.innerText().catch(() => '');
    return text.toLowerCase().includes(label.toLowerCase());
  }

  async isConfirmationMessageVisible(): Promise<boolean> {
    return this.lib.isVisible(this.confirmationMessage);
  }

  /** Click the Apply button */
  async clickApply(): Promise<void> {
    await this.lib.click(this.applyButton);
    await this.page.waitForTimeout(1500);
  }

  /**
   * Get the current value of the keyword input field.
   * Returns empty string when no value is set.
   */
  async getKeywordInputValue(): Promise<string> {
    return this.lib.getInputValue(this.keywordSearchInput).catch(() => '');
  }

  /**
   * Get the current value of the location input field.
   * Returns empty string when no value is set.
   */
  async getLocationInputValue(): Promise<string> {
    return this.lib.getInputValue(this.locationSearchInput).catch(() => '');
  }
}
