import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminLoginPage — Page Object for the Jobrator Admin portal login page.
 *
 * The admin portal lives at a different origin than the candidate/employer
 * portal: https://admin.jobrator.com/
 *
 * All locators are defined as private readonly fields.
 * No assertions live here — they belong in step definitions.
 */
export class AdminLoginPage extends BasePage {
  // ── Form inputs ──────────────────────────────────────────────────────────
  private readonly usernameField =
    'input[name="username"], input[type="text"], input[placeholder*="user" i], input[placeholder*="Username" i], input[id*="username" i]';

  private readonly passwordField =
    'input[name="password"], input[type="password"], input[placeholder*="password" i]';

  // ── Buttons ───────────────────────────────────────────────────────────────
  private readonly submitButton =
    'button[type="submit"], button:has-text("Submit"), button:has-text("Login"), button:has-text("Log in"), button:has-text("Sign in"), input[type="submit"]';

  // ── Feedback ──────────────────────────────────────────────────────────────
  private readonly errorMessage =
    '[class*="error"], [class*="alert"], [role="alert"], .notification--error, .invalid-feedback, [class*="danger"]';

  // ── Post-login indicators ─────────────────────────────────────────────────
  private readonly dashboardIndicator =
    '.sidebar, nav[class*="sidebar"], [class*="dashboard"], [class*="admin"], aside, .main-content';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(adminUrl);
    // Wait for either the login form or the dashboard (already logged in)
    await this.page.waitForSelector(
      'input[name="username"], input[type="text"], .sidebar, nav[class*="sidebar"], aside',
      { timeout: 15000 }
    ).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.usernameField);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async enterUsername(username: string): Promise<void> {
    await this.lib.clearAndFill(this.usernameField, username);
  }

  async enterPassword(password: string): Promise<void> {
    await this.lib.clearAndFill(this.passwordField, password);
  }

  async clickSubmit(): Promise<void> {
    await this.lib.click(this.submitButton);
  }

  async login(username: string, password: string): Promise<void> {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickSubmit();
  }

  // ── State queries ─────────────────────────────────────────────────────────

  async isUsernameFieldVisible(): Promise<boolean> {
    return this.lib.isVisible(this.usernameField);
  }

  async isPasswordFieldVisible(): Promise<boolean> {
    return this.lib.isVisible(this.passwordField);
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    return this.lib.isVisible(this.submitButton);
  }

  async isErrorVisible(): Promise<boolean> {
    return this.lib.isVisible(this.errorMessage);
  }

  async getError(): Promise<string> {
    const visible = await this.lib.isVisible(this.errorMessage);
    if (!visible) return '';
    return this.lib.getText(this.errorMessage);
  }

  async isDashboardVisible(): Promise<boolean> {
    return this.lib.isVisible(this.dashboardIndicator);
  }

  isOnLoginPage(): boolean {
    const url = this.getCurrentUrl();
    return !url.includes('/dashboard') && !url.includes('/user') && !url.includes('/settings');
  }
}
