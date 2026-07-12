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

  async checkTerms(): Promise<void> {
    await this.page.locator(this.termsCheckboxLabel).first().click();
  }

  async clickSubmit(): Promise<void> {
    await this.lib.click(this.submitButton);
  }

  async fillAllFields(
    companyName: string, phone: string, email: string, password: string
  ): Promise<void> {
    await this.enterCompanyName(companyName);
    await this.enterPhone(phone);
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.enterConfirmPassword(password);
    await this.checkTerms();
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
