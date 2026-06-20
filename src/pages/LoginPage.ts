import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * LoginPage — Page Object for the Jobrator login page.
 *
 * All locators are defined as private readonly fields at the top of the class.
 * All actions are public async methods called by step definitions.
 * No assertions live here — assertions belong in step definitions.
 */
export class LoginPage extends BasePage {
  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  //  Using a mix of role-based, label-based and attribute selectors for
  //  resilience — Playwright best practice is to prefer user-facing roles.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Form inputs ───────────────────────────────────────────────────────────
  // email is type="text" on Jobrator (not type="email")
  private readonly emailInput =
    'input[name="email"], input[type="email"], [placeholder*="email" i], [data-testid="email-input"]';

  private readonly passwordInput =
    'input[name="password"], input[type="password"], [placeholder*="password" i], [data-testid="password-input"]';

  // Required consent / readiness checkbox on the login form
  private readonly readyCheckbox = 'input[name="checkbox-ready"], #checkbox-ready';

  // ── Buttons ───────────────────────────────────────────────────────────────
  private readonly loginButton =
    'button[type="submit"]:has-text("Log in"), button[type="submit"]:has-text("Log In"), button[type="submit"]:has-text("Login"), [data-testid="login-button"]';

  private readonly forgotPasswordLink =
    '[href="/forget-password"], a:has-text("Forget Password?"), a:has-text("Forget Password"), a:has-text("Forgot password"), [data-testid="forgot-password-link"]';

  private readonly registerLink =
    'a:has-text("Register"), a:has-text("Sign up"), a:has-text("Create account"), [data-testid="register-link"]';

  // ── Error / feedback messages ─────────────────────────────────────────────
  private readonly errorMessage =
    '[class*="error"], [class*="alert"], [role="alert"], .notification--error, [data-testid="error-message"]';

  private readonly fieldErrorEmail =
    '[for="email"] ~ .error, input[name="email"] ~ .error, [data-testid="email-error"], .email-error';

  private readonly fieldErrorPassword =
    '[for="password"] ~ .error, input[name="password"] ~ .error, [data-testid="password-error"], .password-error';

  // ── Post-login indicators ─────────────────────────────────────────────────
  private readonly dashboardIndicator =
    '[data-testid="dashboard"], .dashboard, main[class*="dashboard"], [class*="candidate-home"]';

  private readonly userProfileMenu =
    'a:has-text("Logout"), a.upload-cv, .btn-box, [data-testid="user-menu"], .user-avatar, .profile-menu, [aria-label*="profile" i], [aria-label*="account" i]';

  private readonly logoutButton =
    'a.theme-btn:has-text("Logout"), [data-testid="logout"]';

  // ── Page-level ────────────────────────────────────────────────────────────
  private readonly loginPageHeading =
    'h1:has-text("Login"), h1:has-text("Sign in"), h2:has-text("Login"), [data-testid="login-heading"]';

  private readonly captchaContainer =
    '.g-recaptcha, [data-testid="captcha"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"]';

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
    await this.lib.navigateTo(this.url('/login'));
    // Always click the Candidate tab to ensure the correct login form is active
    const candidateButton = 'button:has-text("Candidate")';
    if (await this.lib.isVisible(candidateButton)) {
      await this.lib.click(candidateButton);
      await this.page.waitForTimeout(500);
    }
    await this.lib.waitForElement(this.emailInput);
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.emailInput);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  /** Enter text into the email field */
  async enterEmail(email: string): Promise<void> {
    await this.lib.clearAndFill(this.emailInput, email);
  }

  /** Enter text into the password field */
  async enterPassword(password: string): Promise<void> {
    await this.lib.clearAndFill(this.passwordInput, password);
  }

  /** Click the login / submit button */
  async clickLoginButton(): Promise<void> {
    await this.lib.click(this.loginButton);
  }

  /**
   * Full login flow — enter credentials, tick the required checkbox, and submit.
   * Does NOT assert success; callers are responsible for assertions.
   */
  async login(email: string, password: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    // The "checkbox-ready" input is hidden (CSS) so Playwright's check() fails even with force.
    // Use evaluate() to set it directly without actionability checks.
    await this.page.evaluate(() => {
      const cb = document.querySelector('input[name="checkbox-ready"]') as HTMLInputElement | null;
      if (cb && !cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await this.clickLoginButton();
  }

  /** Clear the email input without entering a value */
  async clearEmailField(): Promise<void> {
    await this.lib.clearAndFill(this.emailInput, '');
  }

  /** Clear the password input without entering a value */
  async clearPasswordField(): Promise<void> {
    await this.lib.clearAndFill(this.passwordInput, '');
  }

  /** Click the forgot password link */
  async clickForgotPassword(): Promise<void> {
    await this.lib.click(this.forgotPasswordLink);
  }

  /** Click the register / sign-up link */
  async clickRegisterLink(): Promise<void> {
    await this.lib.click(this.registerLink);
  }

  /** Click the logout button (from post-login state) */
  async logout(): Promise<void> {
    await this.lib.click(this.logoutButton);
  }

  /**
   * Attempt to brute-force login — submits wrong credentials N times.
   * Used in account-lockout security scenarios.
   */
  async attemptLoginMultipleTimes(email: string, wrongPassword: string, attempts: number): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      console.log(`[LoginPage] Brute-force attempt ${i + 1}/${attempts}`);
      await this.enterEmail(email);
      await this.enterPassword(wrongPassword);
      await this.clickLoginButton();
      await this.lib.waitMs(800);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries  (boolean / value returns — no assertions)
  // ══════════════════════════════════════════════════════════════════════════

  /** Returns the visible error message text, or empty string if none */
  async getErrorMessage(): Promise<string> {
    const visible = await this.lib.isVisible(this.errorMessage);
    if (!visible) return '';
    return this.lib.getText(this.errorMessage);
  }

  /** Returns the email field-level validation error text */
  async getEmailFieldError(): Promise<string> {
    const visible = await this.lib.isVisible(this.fieldErrorEmail);
    if (!visible) return '';
    return this.lib.getText(this.fieldErrorEmail);
  }

  /** Returns the password field-level validation error text */
  async getPasswordFieldError(): Promise<string> {
    const visible = await this.lib.isVisible(this.fieldErrorPassword);
    if (!visible) return '';
    return this.lib.getText(this.fieldErrorPassword);
  }

  /** True when an error message is visible */
  async hasErrorMessage(): Promise<boolean> {
    return this.lib.isVisible(this.errorMessage);
  }

  /** True when the dashboard / logged-in indicator is visible */
  async isDashboardVisible(): Promise<boolean> {
    return this.lib.isVisible(this.dashboardIndicator);
  }

  /** True when the user profile menu (post-login) is visible */
  async isUserMenuVisible(): Promise<boolean> {
    return this.lib.isVisible(this.userProfileMenu);
  }

  /** True when the forgot-password link exists on the page */
  async isForgotPasswordLinkVisible(): Promise<boolean> {
    return this.lib.isVisible(this.forgotPasswordLink);
  }

  /** True when a CAPTCHA is present (indicates brute-force protection) */
  async isCaptchaVisible(): Promise<boolean> {
    return this.lib.isVisible(this.captchaContainer);
  }

  /** Get the type attribute of the password input (should be "password") */
  async getPasswordInputType(): Promise<string | null> {
    return this.lib.getAttribute(this.passwordInput, 'type');
  }

  /** True when we are currently on the login page (URL check) */
  isOnLoginPage(): boolean {
    const url = this.getCurrentUrl();
    return url.includes('/login') || url.includes('/signin') || url.includes('/auth');
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Security helpers
  // ══════════════════════════════════════════════════════════════════════════

  /** Assert the login page is served over HTTPS */
  assertPageIsHttps(): void {
    this.lib.assertHttps();
  }

  /** Assert the URL does not leak credentials */
  assertNoCredentialsInUrl(): void {
    this.lib.assertNoSensitiveDataInUrl(['password', 'passwd', 'secret', 'token', 'credential']);
  }

  /** Assert the password field masks its input */
  async assertPasswordIsMasked(): Promise<void> {
    await this.lib.assertPasswordMasked(this.passwordInput);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Performance
  // ══════════════════════════════════════════════════════════════════════════

  /** Measure how long the login page takes to load (ms) */
  async measureLoginPageLoadTime(): Promise<number> {
    return this.lib.measureLoadTime(this.url('/login'));
  }
}
