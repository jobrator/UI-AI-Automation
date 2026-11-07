import { Page } from 'playwright';
import { BasePage } from './BasePage';

export class EmployerRegistrationPage extends BasePage {

  // ── Tab ───────────────────────────────────────────────────────────────────
  private readonly employerTab = 'button:has-text("Employer")';

  // ── Form fields (form id="companyRegister") ────────────────────────────────
  private readonly companyNameInput    = 'input[name="companyName"]';
  private readonly companyPhoneInput   = 'input[name="companyPhone"]';
  private readonly emailInput          = 'input[name="companyEmail"]';
  private readonly passwordInput       = 'input[name="companyPassword"]';
  private readonly confirmPasswordInput = 'input[name="companyConfirmPassword"]';
  private readonly termsCheckboxLabel  = 'label[for="checkbox-ready"]';
  private readonly submitButton        = 'button[type="submit"][form="companyRegister"]';

  // ── Feedback ──────────────────────────────────────────────────────────────
  private readonly errorMessage =
    '[class*="error"], [class*="alert"], [role="alert"], [data-testid="error-message"]';

  private readonly successIndicator =
    '[data-testid="registration-success"], [class*="success"], [class*="verify"]';

  private readonly loginLink =
    'a:has-text("Log In"), a:has-text("Login"), a[href="/login"]';

  constructor(page: Page) {
    super(page);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Navigation
  // ══════════════════════════════════════════════════════════════════════════

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/register'));
    await this.lib.click(this.employerTab);
    await this.page.locator(this.companyNameInput).first()
      .waitFor({ state: 'visible', timeout: 15000 });
    // Let the form hydrate before anything is typed. Filled during hydration, React
    // resets the inputs and the terms box, and Register stays disabled. That was the
    // TC_EREG003 / TC068 / TC069 flake under parallel load.
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.companyNameInput);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async enterCompanyName(value: string): Promise<void> {
    await this.lib.clearAndFill(this.companyNameInput, value);
  }

  async clearCompanyName(): Promise<void> {
    await this.lib.clearAndFill(this.companyNameInput, '');
  }

  async enterPhone(value: string): Promise<void> {
    await this.lib.clearAndFill(this.companyPhoneInput, value);
  }

  async enterEmail(value: string): Promise<void> {
    await this.lib.clearAndFill(this.emailInput, value);
  }

  async enterPassword(value: string): Promise<void> {
    await this.lib.clearAndFill(this.passwordInput, value);
  }

  async enterConfirmPassword(value: string): Promise<void> {
    await this.lib.clearAndFill(this.confirmPasswordInput, value);
  }

  /**
   * Ensures the terms box is ticked. Clicking the label TOGGLES it, so a click that
   * lands before the form hydrates, or a second click, left it unticked and the
   * Register button disabled (TC_EREG003 / TC068 / TC069 under parallel load).
   * Click only until the hidden input reports checked.
   */
  async checkTerms(): Promise<void> {
    const box = this.page.locator('input#checkbox-ready, input[name="checkbox-ready"]').first();
    for (let attempt = 0; attempt < 4; attempt++) {
      if (await box.isChecked({ timeout: 2000 }).catch(() => false)) return;
      await this.page.locator(this.termsCheckboxLabel).first().click();
      await this.page.waitForTimeout(400);
    }
  }

  async clickSubmit(): Promise<void> {
    const button = this.page.locator(this.submitButton).filter({ visible: true }).first();
    // The button enables only once every field is valid and the terms box is ticked.
    // Give a slow-hydrating form a moment, re-assert the terms box once, and if it
    // still won't enable, click anyway so negative scenarios see the form's own
    // validation, rather than waiting out a 30s timeout on a disabled button.
    if (!(await button.isEnabled().catch(() => false))) {
      await this.page.waitForTimeout(1500);
      if (!(await button.isEnabled().catch(() => false))) await this.checkTerms();
    }
    if (await button.isEnabled().catch(() => false)) {
      await this.lib.click(this.submitButton);
    } else {
      await button.click({ force: true, timeout: 5000 }).catch(() => {});
    }
  }

  async fillAllFields(
    companyName: string, phone: string, email: string, password: string
  ): Promise<void> {
    // Fill, then read back. If a late hydration wiped anything, fill again.
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.enterCompanyName(companyName);
      await this.enterPhone(phone);
      await this.enterEmail(email);
      await this.enterPassword(password);
      await this.enterConfirmPassword(password);
      await this.checkTerms();
      await this.page.waitForTimeout(300);
      if (await this.formHolds([
        [this.companyNameInput, companyName], [this.companyPhoneInput, phone], [this.emailInput, email],
        [this.passwordInput, password], [this.confirmPasswordInput, password]
      ])) return;
    }
  }

  private async formHolds(expected: Array<[string, string]>): Promise<boolean> {
    for (const [selector, value] of expected) {
      const actual = await this.page.locator(selector).filter({ visible: true }).first().inputValue().catch(() => '');
      if (actual !== value) return false;
    }
    return this.page.locator('input#checkbox-ready, input[name="checkbox-ready"]').first().isChecked({ timeout: 2000 }).catch(() => false);
  }

  async clickLoginLink(): Promise<void> {
    await this.lib.click(this.loginLink);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries
  // ══════════════════════════════════════════════════════════════════════════

  async isRegistrationSuccessful(): Promise<boolean> {
    const url = this.page.url().toLowerCase();
    if (/dashboard|verify|success|home/i.test(url)) return true;
    return this.lib.isVisible(this.successIndicator);
  }

  async hasErrorMessage(): Promise<boolean> {
    return this.lib.isVisible(this.errorMessage);
  }

  isOnRegistrationPage(): boolean {
    const url = this.page.url().toLowerCase();
    return url.includes('/register');
  }

  async isCompanyNameInputVisible(): Promise<boolean> {
    return this.lib.isVisible(this.companyNameInput);
  }

  async isPhoneInputVisible(): Promise<boolean> {
    return this.lib.isVisible(this.companyPhoneInput);
  }

  async isEmailInputVisible(): Promise<boolean> {
    return this.lib.isVisible(this.emailInput);
  }

  async isPasswordInputVisible(): Promise<boolean> {
    return this.lib.isVisible(this.passwordInput);
  }

  async isConfirmPasswordInputVisible(): Promise<boolean> {
    return this.lib.isVisible(this.confirmPasswordInput);
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    return this.lib.isVisible(this.submitButton);
  }

  async isLoginLinkVisible(): Promise<boolean> {
    return this.lib.isVisible(this.loginLink);
  }

  async getPasswordInputType(): Promise<string | null> {
    return this.lib.getAttribute(this.passwordInput, 'type');
  }

  async getConfirmPasswordInputType(): Promise<string | null> {
    return this.lib.getAttribute(this.confirmPasswordInput, 'type');
  }

  assertPageIsHttps(): void {
    this.lib.assertHttps();
  }
}
