import { Page } from 'playwright';
import { BasePage } from './BasePage';

export class RegistrationPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly registerTrigger =
    'a.call-modal:has-text("Register")';

  private readonly firstNameInput =
    'input[name="candidateFirstName"]';

  private readonly lastNameInput =
    'input[name="candidateLastName"]';

  private readonly emailInput =
    'input[name="candidateEmail"]';

  private readonly passwordInput =
    'input[name="candidatePassword"]';

  private readonly confirmPasswordInput =
    'input[name="candidateConfirmPassword"]';

  private readonly termsCheckboxLabel =
    'label[for="checkbox-ready"]';

  private readonly submitButton =
    'button[type="submit"][form="candidateRegister"]';

  private readonly errorMessage =
    '[class*="error"], [class*="alert"], [role="alert"], [data-testid="error-message"]';

  private readonly successIndicator =
    '[data-testid="registration-success"], [class*="success"], [class*="verify"]';

  private readonly dashboardIndicator =
    '[data-testid="dashboard"], .dashboard, [class*="candidate-home"]';

  private readonly loginLink =
    'a.call-modal.login';

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
    await this.page.locator(this.registerTrigger).first().click();
    await this.page.locator(this.firstNameInput).first().waitFor({ state: 'visible', timeout: 15000 });
    // Let the form hydrate before anything is typed. Filled during hydration, React
    // resets the inputs and the terms box, and Register stays disabled. That was the
    // TC_EREG003 / TC068 / TC069 flake under parallel load.
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.firstNameInput);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async enterFirstName(firstName: string): Promise<void> {
    await this.lib.clearAndFill(this.firstNameInput, firstName);
  }

  async enterLastName(lastName: string): Promise<void> {
    await this.lib.clearAndFill(this.lastNameInput, lastName);
  }

  async enterEmail(email: string): Promise<void> {
    await this.lib.clearAndFill(this.emailInput, email);
  }

  async enterPassword(password: string): Promise<void> {
    await this.lib.clearAndFill(this.passwordInput, password);
  }

  async enterConfirmPassword(password: string): Promise<void> {
    await this.lib.clearAndFill(this.confirmPasswordInput, password);
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

  async fillAllFields(firstName: string, lastName: string, email: string, password: string): Promise<void> {
    // Fill, then read back. If a late hydration wiped anything, fill again.
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.enterFirstName(firstName);
      await this.enterLastName(lastName);
      await this.enterEmail(email);
      await this.enterPassword(password);
      await this.enterConfirmPassword(password);
      await this.checkTerms();
      await this.page.waitForTimeout(300);
      if (await this.formHolds([
        [this.firstNameInput, firstName], [this.lastNameInput, lastName], [this.emailInput, email],
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
    if (/dashboard|verify|success|home/.test(url)) return true;
    return (
      await this.lib.isVisible(this.successIndicator) ||
      await this.lib.isVisible(this.dashboardIndicator)
    );
  }

  async hasErrorMessage(): Promise<boolean> {
    return this.lib.isVisible(this.errorMessage);
  }

  isOnRegistrationPage(): boolean {
    return this.page.url().includes('/register');
  }

  async isFirstNameInputVisible(): Promise<boolean> {
    return this.lib.isVisible(this.firstNameInput);
  }

  async isLastNameInputVisible(): Promise<boolean> {
    return this.lib.isVisible(this.lastNameInput);
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
