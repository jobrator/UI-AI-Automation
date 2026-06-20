import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * ScheduledInterviewsPage — Page Object for /dashboard/my-scheduled-interview
 */
export class ScheduledInterviewsPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly interviewsList =
    '.interviews-list, .scheduled-interviews, [data-testid="interviews-list"], ' +
    'table tbody, [class*="interview-list"], .interview-items';

  private readonly interviewEntry =
    '.interview-widget, [class*="interview-widget"], ' +
    '.interview-item, .interview-row, .scheduled-interview-card, ' +
    '[data-testid="interview-entry"], table tbody tr, [class*="interview-item"]';

  private readonly jobTitleEl =
    '.interview-widget .notification-list li:nth-child(3) .colored, ' +
    '.interview-widget a[href*="/jobs/"] .colored, ' +
    '.interview-widget a[href*="/jobs/"], ' +
    '.job-title, .interview-job-title, [data-testid="interview-job-title"], ' +
    '.position-name, [class*="job-title"]';

  private readonly employerNameEl =
    '.interview-widget .notification-list li:first-child .colored, ' +
    '.interview-widget a[href*="/company/"] .colored, ' +
    '.interview-widget a[href*="/company/"], ' +
    '.employer-name, .company-name, [data-testid="employer-name"]';

  private readonly dateTimeEl =
    '.interview-widget li.success .colored, ' +
    '.interview-widget .success .colored, ' +
    '.interview-date, .interview-time, .scheduled-date, ' +
    '[data-testid="interview-datetime"], [class*="date"], [class*="time"]';

  private readonly locationLinkEl =
    '.interview-location, .meeting-link, a[href*="meet"], a[href*="zoom"], a[href*="teams"], ' +
    'a[href*="google"], td.location, [data-testid="interview-location"], ' +
    '[class*="location"], [class*="meeting"]';

  private readonly emptyState =
    '.empty-state, [class*="no-result"], [class*="empty"], [class*="no-interview"], ' +
    '*:has-text("No interviews"), *:has-text("No scheduled"), ' +
    '*:has-text("no interview"), *:has-text("haven\'t scheduled"), ' +
    '[data-testid="empty-state"]';

  private readonly sidebarInterviewsLink =
    'a[href*="scheduled-interview"], a:has-text("Scheduled Interviews"), ' +
    'a:has-text("My Interviews"), [data-testid="sidebar-interviews-link"], ' +
    '.sidebar a:has-text("Interview"), nav a:has-text("Interview")';

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
    await this.lib.navigateTo(this.url('/dashboard/my-scheduled-interview'));
    await this.page.waitForTimeout(1500);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('domcontentloaded');
    return (
      (await this.lib.isVisible(this.interviewsList)) ||
      (await this.lib.isVisible(this.emptyState)) ||
      (await this.lib.isVisible(this.interviewEntry))
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Query methods
  // ══════════════════════════════════════════════════════════════════════════

  async getInterviewCount(): Promise<number> {
    return this.lib.getCount(this.interviewEntry);
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return this.lib.isVisible(this.emptyState);
  }

  async hasInterviews(): Promise<boolean> {
    return (await this.getInterviewCount()) > 0;
  }

  async isInterviewDetailsVisible(): Promise<boolean> {
    return (
      (await this.lib.isVisible(this.interviewEntry)) &&
      (await this.getInterviewCount()) > 0
    );
  }

  async isJobTitleVisible(): Promise<boolean> {
    return this.lib.isVisible(this.jobTitleEl);
  }

  async isEmployerNameVisible(): Promise<boolean> {
    return this.lib.isVisible(this.employerNameEl);
  }

  async isDateTimeVisible(): Promise<boolean> {
    return this.lib.isVisible(this.dateTimeEl);
  }

  async isLocationOrMeetingLinkVisible(): Promise<boolean> {
    return this.lib.isVisible(this.locationLinkEl);
  }

  async getFirstInterviewDetails(): Promise<{ jobTitle: string; employer: string; dateTime: string }> {
    const jobTitle = await this.lib.getText(this.jobTitleEl).catch(() => '');
    const employer = await this.lib.getText(this.employerNameEl).catch(() => '');
    const dateTime = await this.lib.getText(this.dateTimeEl).catch(() => '');
    return { jobTitle, employer, dateTime };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async clickSidebarLink(): Promise<void> {
    await this.lib.click(this.sidebarInterviewsLink);
    await this.page.waitForTimeout(1500);
  }

  async isOnScheduledInterviewsPage(): Promise<boolean> {
    return /scheduled-interview|my-interview/i.test(this.page.url());
  }
}
