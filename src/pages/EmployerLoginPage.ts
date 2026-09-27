import { Page } from 'playwright';
import { LoginPage } from './LoginPage';

export class EmployerLoginPage extends LoginPage {

  private readonly employerTab = 'button:has-text("Employer"), [data-tab="employer"], a:has-text("Employer")';

  private readonly employerDashboardIndicator =
    '[data-testid="employer-dashboard"], [class*="employer-home"], [class*="employer-dashboard"], ' +
    '.employer-dashboard, main[class*="employer"]';

  private readonly employerProfileMenu =
    'span.name, a.dropdown-toggle[data-bs-toggle="dropdown"]';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/login'));
    await this.selectAccountTypeTab();
    await this.lib.waitForElement(
      'input[name="email"], input[type="email"], [placeholder*="email" i]'
    );
  }

  /**
   * Employer counterpart of the base Candidate tab selection — the inherited
   * `login()` calls this, so it must pick Employer here or employer credentials
   * are submitted against the candidate profile and come back 401.
   */
  protected async selectAccountTypeTab(): Promise<void> {
    if (await this.lib.isVisible(this.employerTab)) {
      await this.lib.click(this.employerTab);
      await this.page.waitForTimeout(500);
    }
  }

  async isEmployerDashboardVisible(): Promise<boolean> {
    const url = this.page.url().toLowerCase();
    if (/employer|recruiter|post-job|manage-job/i.test(url)) return true;
    return this.lib.isVisible(this.employerDashboardIndicator);
  }

  async isEmployerMenuVisible(): Promise<boolean> {
    try {
      await this.page.locator(this.employerProfileMenu).first()
        .waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}
