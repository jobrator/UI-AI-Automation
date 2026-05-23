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

  async checkTerms(): Promise<void> {
    await this.page.locator(this.termsCheckboxLabel).first().click();
  }

  async clickSubmit(): Promise<void> {
    await this.lib.click(this.submitButton);
  }

  async fillAllFields(firstName: string, lastName: string, email: string, password: string): Promise<void> {
    await this.enterFirstName(firstName);
    await this.enterLastName(lastName);
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
