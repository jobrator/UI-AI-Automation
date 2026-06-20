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
    const employerTabVisible = await this.lib.isVisible(this.employerTab);
    if (employerTabVisible) {
      await this.lib.click(this.employerTab);
      await this.page.waitForTimeout(500);
    }
    await this.lib.waitForElement(
      'input[name="email"], input[type="email"], [placeholder*="email" i]'
    );
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
