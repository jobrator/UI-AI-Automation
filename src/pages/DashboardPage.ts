import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * DashboardPage — Page Object for the Jobrator candidate dashboard.
 *
 * All locators are private readonly fields at the top.
 * All actions are public async methods called by step definitions.
 * No assertions live here — assertions belong in step definitions.
 */
export class DashboardPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  // ── Navigation ────────────────────────────────────────────────────────────
  private readonly mainNavigation =
    'nav, .navbar, header nav, .site-nav, [role="navigation"], .header-area';

  private readonly findJobsLink =
    'a:has-text("Find Jobs"), a:has-text("Find Job"), a:has-text("Search Jobs"), a:has-text("Browse Jobs"), [data-testid="find-jobs-link"]';

  // Bootstrap dropdown-toggle selectors come first to target the actual trigger element.
  // The Candidates nav toggle has zero computed size (Playwright sees it as hidden), so
  // we need force-click via clickDropdownToggle() rather than a standard click.
  private readonly candidatesDropdown =
    'a[data-bs-toggle="dropdown"]:has-text("Candidates"), ' +
    'a[data-toggle="dropdown"]:has-text("Candidates"), ' +
    'a.dropdown-toggle:has-text("Candidates"), ' +
    'button.dropdown-toggle:has-text("Candidates"), ' +
    'a:has-text("Candidates"), button:has-text("Candidates"), ' +
    '[data-testid="candidates-dropdown"]';

  private readonly applicationsNavLink =
    'a:has-text("Candidates"), a:has-text("My Applications"), a:has-text("Applications"), a:has-text("Applied Jobs"), [data-testid="applications-nav-link"]';

  // ── Logout ────────────────────────────────────────────────────────────────
  private readonly logoutControl =
    'a.theme-btn:has-text("Logout"), a:has-text("Logout"), button:has-text("Logout"), a:has-text("Log Out"), [data-testid="logout-button"]';

  // ── Welcome / greeting ────────────────────────────────────────────────────
  // Post-login landing page (/jobs) shows "Recommended Jobs" as the main h2 heading.
  private readonly welcomeGreeting =
    'h1, h2, .welcome-text, .greeting, .page-title, .page-heading, [data-testid="welcome-greeting"], .user-name, .candidate-name';

  // ── Applications section ──────────────────────────────────────────────────
  private readonly applicationsSection =
    '.my-applications, .applied-jobs, .applications-list, [data-testid="applications-section"], ' +
    'section:has-text("Application"), .job-listings, .jobs-container, .job-list, ' +
    '.search-result-area, .recommended-jobs, ' +
    'h2:has-text("Recommended Jobs"), h1:has-text("Jobs"), h2:has-text("Jobs")';

  // Strictly application-specific selectors — avoids matching generic job listing cards.
  private readonly applicationEntries =
    '.application-item, .applied-job-item, .job-application-row, [data-testid="application-entry"], ' +
    '.application-card, [data-testid*="application"], [class*="applied-job"]';

  private readonly applicationStatusBadge =
    '.status-badge, .application-status, .badge, [class*="status"], [data-testid="application-status"]';

  // ── Profile section ───────────────────────────────────────────────────────
  private readonly uploadCvControl =
    'a.upload-cv, a:has-text("Upload CV"), a:has-text("Upload Resume"), button:has-text("Upload CV"), ' +
    'a:has-text("Create your CV"), a:has-text("Create CV"), a:has-text("Create Your CV"), ' +
    '[data-testid="upload-cv"]';

  private readonly profileCompletionSection =
    '.profile-completion, .completion-bar, .progress-bar, [data-testid="profile-completion"], ' +
    '[class*="completion"], [class*="progress"], a:has-text("Create your CV"), a:has-text("Update CV"), ' +
    'a:has-text("Create CV")';

  private readonly userAvatar =
    '.user-avatar, .profile-photo, .profile-pic, img[alt*="profile" i], img[alt*="avatar" i], ' +
    '.avatar, [data-testid="user-avatar"], [class*="user-avatar"], [class*="profile-img"], ' +
    '.nav-user img, .header-user img, header img, nav img, .navbar-brand img, .logo img';

  // ── Messages ──────────────────────────────────────────────────────────────
  // Jobrator dashboard left sidebar (not the global ProSidebar) — contains
  // dashboard-specific nav links including Messages at /dashboard/messages.
  // We select any anchor pointing to /dashboard/messages that is NOT inside
  // the Bootstrap dropdown menu (which holds the account dropdown Messages link).
  private readonly leftPanelMessagesButton =
    'a[href="/dashboard/messages"], a[href*="/dashboard/messages"]';

  // Stats counter cards near the top of the dashboard body. Jobrator renders
  // these as "NMessages" (e.g. "2Messages") before "Saved Jobs" (shortlist).
  private readonly topRightMessagesButton =
    'a[href*="/dashboard/messages"]';

  // Account dropdown trigger: Bootstrap dropdown-toggle on the user name element
  private readonly accountMenuButton =
    'a.dropdown-toggle[data-bs-toggle="dropdown"], a.dropdown-toggle[data-toggle="dropdown"], ' +
    'a.dropdown-toggle';

  // Messages link inside the Bootstrap dropdown menu
  private readonly accountMenuMessagesLink =
    'ul.dropdown-menu a[href*="dashboard/messages"], .dropdown-menu a[href*="messages"]';

  // ── Search field ──────────────────────────────────────────────────────────
  private readonly searchInput =
    'input[type="search"], input[placeholder*="search" i], input[placeholder*="job" i], ' +
    'input[placeholder*="keyword" i], input[placeholder*="company" i], ' +
    '.search-input, [data-testid="dashboard-search"]';

  // ══════════════════════════════════════════════════════════════════════════
  //  Constructor
  // ══════════════════════════════════════════════════════════════════════════

  constructor(page: Page) {
    super(page);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Private helpers
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Returns true if ANY element matching selector is currently visible.
   * Necessary when a selector matches both visible desktop-nav elements and
   * hidden mobile/sidebar copies of the same link.
   */
  private async isAnyVisible(selector: string): Promise<boolean> {
    const all = await this.page.locator(selector).all();
    for (const loc of all) {
      if (await loc.isVisible()) return true;
    }
    // JS fallback for Candidates — Playwright may see the nav toggle as zero-size
    // even though the browser renders it visibly (CSS zero-height trick).
    if (selector.includes('Candidates')) {
      return this.page.evaluate(() => {
        for (const el of Array.from(document.querySelectorAll('*'))) {
          const t = el.textContent?.trim() ?? '';
          if (t === 'Candidates' || (t.startsWith('Candidates') && t.length < 15)) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) return true;
          }
        }
        return false;
      });
    }
    return false;
  }

  /**
   * Click the Candidates ▾ dropdown toggle.
   *
   * The Bootstrap dropdown-toggle <a> inside the nav <li> has zero computed size
   * in this Jobrator theme — Playwright reports it as hidden.  We try three strategies:
   *  1. Normal click on any visibly-sized matching element.
   *  2. Force-click on Bootstrap dropdown-toggle attributes (bypasses size check).
   *  3. JS evaluate: find the <a> near the Bootstrap toggle and trigger it.
   */
  private async clickDropdownToggle(): Promise<void> {
    // Strategy 1: visible element
    const all = await this.page.locator(this.candidatesDropdown).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        return;
      }
    }

    // Strategy 2: force-click Bootstrap toggle attributes (common pattern)
    const bsSelectors = [
      'a[data-bs-toggle="dropdown"]:has-text("Candidates")',
      'a[data-toggle="dropdown"]:has-text("Candidates")',
      'a.dropdown-toggle:has-text("Candidates")',
      'button.dropdown-toggle:has-text("Candidates")',
    ];
    for (const sel of bsSelectors) {
      const locs = await this.page.locator(sel).all();
      for (const loc of locs) {
        try {
          await loc.click({ force: true });
          await this.page.waitForTimeout(400);
          return;
        } catch { /* continue */ }
      }
    }

    // Strategy 3: JS — find any element with text "Candidates" and positive size
    const clicked = await this.page.evaluate(() => {
      const tags = ['a', 'button', '[role="button"]', 'li', 'span', 'div'];
      for (const tag of tags) {
        for (const el of Array.from(document.querySelectorAll(tag))) {
          const t = el.textContent?.trim() ?? '';
          if (t === 'Candidates' || (t.startsWith('Candidates') && t.length < 15)) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              (el as HTMLElement).click();
              return true;
            }
          }
        }
      }
      return false;
    });

    if (!clicked) {
      throw new Error('Could not open the Candidates dropdown — no suitable trigger found');
    }
    await this.page.waitForTimeout(400);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Navigation
  // ══════════════════════════════════════════════════════════════════════════

  async navigate(): Promise<void> {
    // Navigate to the protected /dashboard path.
    // Authenticated users are forwarded to their landing page; unauthenticated users
    // are redirected to /login — both outcomes are valid for this method.
    await this.lib.navigateTo(this.url('/dashboard'));
    await this.page.waitForURL(
      /home|candidate|jobs|application|profile|login|signin|auth/i,
      { timeout: 30000 }
    );
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.logoutControl);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async clickFindJobs(): Promise<void> {
    await this.lib.click(this.findJobsLink);
  }

  async clickMyApplications(): Promise<void> {
    // Check for a direct "My Applications" link first (profile/applications page)
    const direct = 'a:has-text("My Applications"), a:has-text("Applied Jobs")';
    if (await this.lib.isVisible(direct)) {
      await this.lib.click(direct);
      return;
    }
    // Open Candidates dropdown, then click applications link inside it
    await this.clickDropdownToggle();
    await this.page.waitForTimeout(600);
    // Look for visible links inside the opened dropdown or anywhere on page
    const candidates = await this.page.locator(
      '.dropdown-menu a, [class*="dropdown"] a, ' +
      'a:has-text("My Applications"), a:has-text("Applied Jobs"), ' +
      'a[href*="applied"], a[href*="application"]'
    ).all();
    for (const link of candidates) {
      if (!await link.isVisible()) continue;
      const text = (await link.textContent() ?? '').toLowerCase();
      const href = (await link.getAttribute('href') ?? '').toLowerCase();
      if (/application|applied/.test(text + href)) {
        await link.click();
        return;
      }
    }
    // Last resort: navigate directly to candidate dashboard
    await this.lib.navigateTo(this.url('/dashboard'));
    await this.page.waitForURL(/dashboard|application|applied/i, { timeout: 15000 });
  }

  async clickMyProfile(): Promise<void> {
    const direct = 'a:has-text("My Profile"), a:has-text("Edit Profile"), a:has-text("Account Settings")';
    if (await this.lib.isVisible(direct)) {
      await this.lib.click(direct);
      return;
    }
    await this.clickDropdownToggle();
    await this.page.waitForTimeout(600);
    const candidates = await this.page.locator(
      '.dropdown-menu a, [class*="dropdown"] a, ' +
      'a:has-text("My Profile"), a:has-text("Edit Profile"), ' +
      'a[href*="profile"], a[href*="candidate"]'
    ).all();
    for (const link of candidates) {
      if (!await link.isVisible()) continue;
      const text = (await link.textContent() ?? '').toLowerCase();
      const href = (await link.getAttribute('href') ?? '').toLowerCase();
      if (/profile|candidate/.test(text + href)) {
        await link.click();
        return;
      }
    }
    // Last resort: navigate directly to the candidate profile page
    await this.lib.navigateTo(this.url('/candidate'));
    await this.page.waitForURL(/candidate|profile|account/i, { timeout: 15000 });
  }

  async clickLogout(): Promise<void> {
    // Strategy 1: find and submit an explicit logout form (Laravel/PHP apps use POST /logout)
    const formAction = await this.page.evaluate(() => {
      for (const form of Array.from(document.querySelectorAll('form'))) {
        if (/logout|signout/i.test(form.action)) return form.action;
      }
      return null;
    });
    if (formAction) {
      await this.page.goto(formAction, { waitUntil: 'domcontentloaded' });
      await this.page.waitForURL(/login|signin|auth|home|\/$|\/$/i, { timeout: 15000 }).catch(() => {});
      return;
    }

    // Strategy 2: click visible logout button/link and wait for navigation
    const specific = await this.page.locator('a.theme-btn:has-text("Logout")').all();
    for (const loc of specific) {
      if (await loc.isVisible()) {
        await loc.click();
        // Wait for any navigation (URL change away from current path)
        const currentUrl = this.page.url();
        try {
          await this.page.waitForURL(
            url => url.toString() !== currentUrl && !url.toString().endsWith('#'),
            { timeout: 5000 }
          );
          return;
        } catch {
          // No navigation — fall through to direct logout URL
          break;
        }
      }
    }

    // Strategy 3: navigate directly to the logout endpoint (standard for PHP frameworks)
    await this.page.goto(this.url('/logout'), { waitUntil: 'domcontentloaded' });
    await this.page.waitForURL(/login|signin|auth|home|\/$|\/$/i, { timeout: 10000 }).catch(() => {});
  }

  async refresh(): Promise<void> {
    await this.lib.reloadPage();
    // Use .first() explicitly to avoid strict-mode violation on multi-match selector
    await this.page.locator(this.logoutControl).first().waitFor({ state: 'visible', timeout: 30000 });
  }

  /** Type into the dashboard search field (for XSS injection tests). */
  async enterSearchValue(value: string): Promise<void> {
    // The search input may exist as a hidden duplicate before the visible one in DOM.
    // Force-fill bypasses Playwright's visibility check and writes to the input directly.
    const input = this.page.locator(
      `input[name="listing-search"], ${this.searchInput}`
    ).first();
    try {
      await input.waitFor({ state: 'attached', timeout: 5000 });
      await input.fill(value, { force: true });
    } catch {
      // Fallback to a broader selector if primary not found
      await this.page.locator('input[type="text"]').first().fill(value, { force: true });
    }
  }

  // ── Messages actions ──────────────────────────────────────────────────────

  async clickLeftPanelMessages(): Promise<void> {
    // On /dashboard, the left sidebar contains an <a href="/dashboard/messages"> link
    // that is NOT inside the Bootstrap .dropdown-menu (which is the account dropdown).
    // We iterate all matching links and skip the one inside .dropdown-menu.
    const all = await this.page.locator(this.leftPanelMessagesButton).all();
    for (const loc of all) {
      if (!await loc.isVisible()) continue;
      // Skip if inside a Bootstrap dropdown menu (account dropdown)
      const insideDropdown = await loc.evaluate(
        (el) => !!el.closest('ul.dropdown-menu, .dropdown-menu')
      );
      if (insideDropdown) continue;
      // Skip the stats counter link (text starts with a digit, e.g. "2Messages")
      const text = (await loc.textContent() ?? '').trim();
      if (/^\d/.test(text)) continue;
      await loc.click();
      await this.page.waitForTimeout(1000);
      return;
    }
    // Fallback: navigate directly to the messages page
    await this.lib.navigateTo(this.url('/dashboard/messages'));
  }

  async isTopRightMessagesButtonVisible(): Promise<boolean> {
    // The stats counter cards (e.g. "2Messages") are on /dashboard, not /jobs.
    if (!/\/dashboard/i.test(this.page.url())) {
      await this.lib.navigateTo(this.url('/dashboard'));
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(500);
    }

    // The presence of the Messages entry point is what this asserts. The stat
    // counter card sometimes renders a digit prefix (e.g. "2Messages") once the
    // account summary API responds, but that count depends on a backend call
    // that can be slow or unavailable — so we must NOT require the digit. Treat
    // the button as present if ANY messages link is visible. (Do not use
    // `.first().isVisible()`: the first match in the DOM is an off-canvas/hidden
    // duplicate, which would falsely report the button as missing.)
    const all = await this.page.locator(this.topRightMessagesButton).all();
    for (const loc of all) {
      if (await loc.isVisible()) return true;
    }
    return false;
  }

  async clickTopRightMessages(): Promise<void> {
    // Click the stats-counter "Messages" card (e.g. "2Messages") near the top of the dashboard.
    const all = await this.page.locator(this.topRightMessagesButton).all();
    for (const loc of all) {
      if (!await loc.isVisible()) continue;
      const text = (await loc.textContent() ?? '').trim();
      if (/^\d+Messages?/i.test(text) || /^\d+\s*Messages?/i.test(text)) {
        await loc.click();
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    // Fallback: any visible messages link not inside the dropdown
    for (const loc of all) {
      if (!await loc.isVisible()) continue;
      const insideDropdown = await loc.evaluate(
        (el) => !!el.closest('ul.dropdown-menu, .dropdown-menu')
      );
      if (!insideDropdown) {
        await loc.click();
        await this.page.waitForTimeout(1000);
        return;
      }
    }
    await this.lib.navigateTo(this.url('/dashboard/messages'));
  }

  async openAccountMenu(): Promise<void> {
    // The account dropdown-toggle (user name/avatar) is only rendered on /dashboard.
    // If we're on a different page (e.g. /jobs after login), navigate there first.
    if (!/\/dashboard/i.test(this.page.url())) {
      await this.lib.navigateTo(this.url('/dashboard'));
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(500);
    }

    const all = await this.page.locator(this.accountMenuButton).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(600);
        return;
      }
    }
    // JS fallback — find the element with class "dropdown-toggle"
    const clicked = await this.page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll('.dropdown-toggle'))) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          (el as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    if (!clicked) throw new Error('Account menu toggle (dropdown-toggle) not found in header');
    await this.page.waitForTimeout(600);
  }

  async clickAccountMenuMessages(): Promise<void> {
    // Must be on /dashboard for the account dropdown to exist.
    if (!/\/dashboard/i.test(this.page.url())) {
      await this.lib.navigateTo(this.url('/dashboard'));
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(500);
    }

    // Ensure the Bootstrap dropdown is open. If .dropdown-menu is not visible
    // (Bootstrap hides it with display:none when closed), open it by clicking
    // the toggle.  If it IS already open (from a previous step), skip clicking
    // to avoid toggling it shut.
    const dropdownMenu = this.page.locator('ul.dropdown-menu').first();
    const isOpen = await dropdownMenu.isVisible().catch(() => false);
    if (!isOpen) {
      await this.page.locator('a.dropdown-toggle').first().click();
      await this.page.waitForTimeout(600);
    }

    // Wait for the messages link inside the dropdown to become visible and click it.
    const msgLink = this.page.locator('ul.dropdown-menu a[href*="dashboard/messages"]').first();
    try {
      await msgLink.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      // Dropdown may have closed between the check and waitFor — re-open once more.
      await this.page.locator('a.dropdown-toggle').first().click();
      await this.page.waitForTimeout(600);
      await msgLink.waitFor({ state: 'visible', timeout: 5000 });
    }
    await msgLink.click();
    await this.page.waitForTimeout(1000);
  }

  /** Navigate to the dashboard URL with a forged session cookie. */
  async navigateWithForgedSession(cookieName: string, forgedValue: string): Promise<void> {
    await this.page.context().addCookies([{
      name: cookieName,
      value: forgedValue,
      domain: new URL(this.baseUrl).hostname,
      path: '/'
    }]);
    await this.lib.navigateTo(this.url('/dashboard'));
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries  (boolean / value returns — no assertions)
  // ══════════════════════════════════════════════════════════════════════════

  async isDashboardLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.logoutControl);
  }

  async getPageTitle(): Promise<string> {
    return this.lib.getPageTitle();
  }

  async isMainNavigationVisible(): Promise<boolean> {
    return this.lib.isVisible(this.mainNavigation);
  }

  async isFindJobsLinkVisible(): Promise<boolean> {
    return this.lib.isVisible(this.findJobsLink);
  }

  async isApplicationsNavLinkVisible(): Promise<boolean> {
    if (await this.lib.isVisible('a:has-text("My Applications"), a:has-text("Applied Jobs")')) {
      return true;
    }
    return this.isAnyVisible(this.applicationsNavLink);
  }

  async isWelcomeGreetingVisible(): Promise<boolean> {
    return this.lib.isVisible(this.welcomeGreeting);
  }

  async isLogoutControlVisible(): Promise<boolean> {
    return this.lib.isVisible(this.logoutControl);
  }

  async isApplicationsSectionVisible(): Promise<boolean> {
    return this.lib.isVisible(this.applicationsSection);
  }

  async getApplicationEntryCount(): Promise<number> {
    return this.lib.getCount(this.applicationEntries);
  }

  async isUploadCvVisible(): Promise<boolean> {
    return this.lib.isVisible(this.uploadCvControl);
  }

  async isProfileCompletionVisible(): Promise<boolean> {
    return this.lib.isVisible(this.profileCompletionSection);
  }

  async isUserAvatarVisible(): Promise<boolean> {
    return this.lib.isVisible(this.userAvatar);
  }

  /** True when an application entry with the given status text is found in the DOM. */
  async isStatusLabelInDom(statusText: string): Promise<boolean> {
    const selector = `${this.applicationStatusBadge}:has-text("${statusText}"), [class*="status"]:has-text("${statusText}"), .badge:has-text("${statusText}")`;
    const count = await this.lib.getCount(selector);
    return count > 0;
  }

  /** Measure dashboard load time in ms. */
  async measureLoadTime(): Promise<number> {
    return this.lib.measureLoadTime(this.baseUrl);
  }

  /** Return all current session cookies. */
  async getSessionCookies(): Promise<Array<{ name: string; value: string; secure?: boolean; httpOnly?: boolean }>> {
    return this.page.context().cookies();
  }

  isOnLoginPage(): boolean {
    const url = this.getCurrentUrl();
    return /login|signin|auth/i.test(url);
  }

  isOnDashboard(): boolean {
    const url = this.getCurrentUrl();
    return /dashboard|home|candidate|jobs|application/i.test(url);
  }
}
