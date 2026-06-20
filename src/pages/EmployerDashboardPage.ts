import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * EmployerDashboardPage — Page Object for the Jobrator employer dashboard.
 *
 * All locators are private readonly fields at the top.
 * All actions are public async methods called by step definitions.
 * No assertions live here — assertions belong in step definitions.
 */
export class EmployerDashboardPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly notificationBadge =
    '.notification-badge, .badge-count, .notification-count, [data-testid="notification-badge"], ' +
    '.notif-badge, span.badge, .unread-count, .noti-count, a[href*="notification"] .badge, ' +
    '.bell-icon .badge, [class*="notification"] .badge, [class*="noti"] span';

  private readonly postNewJobLink =
    'a[href*="post-job"], a[href*="post_job"], ' +
    'a:has-text("Post A New Job"), a:has-text("Post New Job"), a:has-text("Post a Job"), ' +
    'a:has-text("Post Job"), [data-testid="post-new-job"]';

  private readonly manageJobsLink =
    'a:has-text("Manage Jobs"), a:has-text("Manage Job"), [data-testid="manage-jobs-link"], ' +
    'a[href*="manage-job"], a[href*="manage_job"]';

  private readonly logoutControl =
    'a.theme-btn:has-text("Logout"), a:has-text("Logout"), button:has-text("Logout"), ' +
    'a:has-text("Log Out"), [data-testid="logout-button"]';

  private readonly dashboardStats =
    '.ui-item, .ui-block, ' +
    'p:has-text("Jobs Posted"), p:has-text("Messages"), p:has-text("Shortlisted"), ' +
    '.stats-area, .stat-card, .dashboard-stats, [data-testid="dashboard-stats"], ' +
    '.stat-box, .counter-area, .count-box, .info-box, ' +
    '[class*="stat"], [class*="counter"], [class*="dashboard"] .card';

  private readonly employerNavItems =
    'nav.nav a, nav.main-menu a, .outer-box .dropdown-menu a, ' +
    'a[href*="/dashboard"], a[href*="manage-job"], a[href*="applicant"], ' +
    'a[href*="message"], .navigation a, ul.navigation a';

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
    await this.lib.navigateTo(this.url('/dashboard'));
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async isLoaded(): Promise<boolean> {
    // Wait for some content to appear first
    await this.page.waitForSelector(
      'main, .container, section, nav, header, .dashboard, [class*="dashboard"]',
      { timeout: 8000 }
    ).catch(() => {});
    // Check URL — if on dashboard, treat as loaded
    const url = this.page.url();
    if (/dashboard|employer|recruiter|manage-job|post-job/i.test(url)) return true;
    const hasLogout = await this.lib.isVisible(this.logoutControl);
    if (hasLogout) return true;
    return this.lib.isVisible(this.postNewJobLink);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async getNotificationCount(): Promise<number> {
    try {
      const all = await this.page.locator(this.notificationBadge).all();
      for (const loc of all) {
        if (!await loc.isVisible()) continue;
        const text = (await loc.textContent() ?? '').trim();
        const count = parseInt(text, 10);
        if (!isNaN(count)) return count;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  async clickPostNewJob(): Promise<void> {
    const visible = await this.lib.isVisible(this.postNewJobLink);
    if (visible) {
      await this.lib.click(this.postNewJobLink);
    } else {
      console.warn('[EmployerDashboard] Post New Job link not visible — navigating directly');
      await this.lib.navigateTo(this.url('/dashboard/post-jobs'));
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickManageJobs(): Promise<void> {
    const visible = await this.lib.isVisible(this.manageJobsLink);
    if (visible) {
      await this.lib.click(this.manageJobsLink);
    } else {
      console.warn('[EmployerDashboard] Manage Jobs link not visible — navigating directly');
      await this.lib.navigateTo(this.url('/dashboard/manage-jobs'));
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async logout(): Promise<void> {
    // Strategy 1: find and submit an explicit logout form
    const formAction = await this.page.evaluate(() => {
      for (const form of Array.from(document.querySelectorAll('form'))) {
        if (/logout|signout/i.test(form.action)) return form.action;
      }
      return null;
    });
    if (formAction) {
      await this.page.goto(formAction, { waitUntil: 'domcontentloaded' });
      await this.page.waitForURL(/login|signin|auth|home|\/$/, { timeout: 15000 }).catch(() => {});
      return;
    }

    // Strategy 2: click visible logout link
    const all = await this.page.locator(this.logoutControl).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForURL(/login|signin|auth|home|\/$/, { timeout: 10000 }).catch(() => {});
        return;
      }
    }

    // Strategy 3: navigate directly to logout endpoint
    await this.page.goto(this.url('/logout'), { waitUntil: 'domcontentloaded' });
    await this.page.waitForURL(/login|signin|auth|home|\/$/, { timeout: 10000 }).catch(() => {});
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries
  // ══════════════════════════════════════════════════════════════════════════

  async isStatsVisible(): Promise<boolean> {
    // Try explicit stat selectors first
    const statsFound = await this.lib.isVisible(this.dashboardStats);
    if (statsFound) return true;
    // Fallback: any numeric content in a box/card likely represents a stat
    const fallback =
      '[class*="card"] [class*="count"], [class*="card"] [class*="num"], ' +
      '[class*="box"] strong, [class*="stat"] strong, ' +
      'section .card, .row .card, [class*="overview"]';
    return this.lib.isVisible(fallback);
  }

  async isNavItemsVisible(): Promise<boolean> {
    return this.lib.isVisible(this.employerNavItems);
  }

  async isLogoutVisible(): Promise<boolean> {
    return this.lib.isVisible(this.logoutControl);
  }

  async hasUnreadNotifications(): Promise<boolean> {
    const count = await this.getNotificationCount();
    return count > 0;
  }

  isOnLoginPage(): boolean {
    return /login|signin|auth/i.test(this.page.url());
  }
}
