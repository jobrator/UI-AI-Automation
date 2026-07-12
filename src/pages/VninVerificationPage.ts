import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * VninVerificationPage — Page Object for /dashboard/vnn-verify
 */
export class VninVerificationPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly firstNameField =
    'input[name="first_name"], input[name="firstname"], input[placeholder*="First Name" i], ' +
    '[data-testid="vnin-first-name"], #first_name, #firstname, ' +
    'input[placeholder*="first" i]';

  private readonly middleNameField =
    'input[name="middle_name"], input[name="middlename"], input[placeholder*="Middle" i], ' +
    '[data-testid="vnin-middle-name"], #middle_name, #middlename';

  private readonly surnameField =
    'input[name="surname"], input[name="last_name"], input[name="lastname"], ' +
    'input[placeholder*="Surname" i], input[placeholder*="Last Name" i], ' +
    '[data-testid="vnin-surname"], #surname, #last_name';

  private readonly genderField =
    'select[name="gender"], select[name="gender_id"], input[name="gender"], ' +
    '[data-testid="vnin-gender"], #gender, select:has(option[value="Male"])';

  private readonly dobField =
    'input[name="dob"], input[name="date_of_birth"], input[type="date"], ' +
    '[data-testid="vnin-dob"], #dob, input[placeholder*="Date of Birth" i], ' +
    'input[placeholder*="DD/MM/YYYY" i]';

  private readonly trustedPhoneField =
    'label:has-text("VNIN"), label:has-text("Registered Number"), ' +
    'input[name="vnin"], input[name="nin"], input[name="vnin_number"], ' +
    'input[name="phone"], input[name="trusted_phone"], input[name="phone_number"], ' +
    'input[type="tel"], input[placeholder*="phone" i], input[placeholder*="Phone" i], ' +
    '[data-testid="vnin-phone"], #phone, #trusted_phone';

  private readonly vninField =
    'input[name="vnin"], input[name="nin"], input[name="vnin_number"], ' +
    'input[placeholder*="VNIN" i], input[placeholder*="NIN" i], ' +
    '[data-testid="vnin-number"], #vnin, #nin';

  private readonly verifyButton =
    'button[type="submit"]:has-text("Verify"), button:has-text("Verify"), ' +
    'input[type="submit"][value*="Verify" i], [data-testid="verify-button"], ' +
    'button:has-text("Submit"), button:has-text("Verify Now")';

  private readonly errorMessage =
    '.alert-danger, .error-message, [class*="error"], .invalid-feedback, ' +
    '[role="alert"]:not([class*="success"]), .swal2-error, .text-danger, ' +
    '[data-testid="error-message"], *:has-text("Invalid"), *:has-text("failed"), ' +
    '*:has-text("incorrect")';

  private readonly successMessage =
    '.alert-success, .success-message, .swal2-success, [class*="success"], ' +
    '[role="alert"]:has-text("success"), .toast-success, ' +
    '[data-testid="success-message"], *:has-text("verified"), *:has-text("successful")';

  private readonly validationErrors =
    '.is-invalid, .invalid-feedback, .error-message, .field-error, ' +
    '[class*="error"], .help-block, span.error, .form-error, ' +
    '[data-testid="validation-error"], .text-danger, [class*="required"]';

  private readonly verifiedBadge =
    '.verified-badge, .badge:has-text("Verified"), .verified, ' +
    '[data-testid="verified-badge"], [class*="verified"], ' +
    '*:has-text("VNIN Verified"), .checkmark-badge, .identity-verified';

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
    await this.lib.navigateTo(this.url('/dashboard/vnn-verify'));
    await this.page.waitForTimeout(1500);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('domcontentloaded');
    return (
      (await this.lib.isVisible(this.vninField)) ||
      (await this.lib.isVisible(this.verifyButton)) ||
      (await this.lib.isVisible(this.firstNameField))
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Field visibility checks
  // ══════════════════════════════════════════════════════════════════════════

  async isFirstNameVisible(): Promise<boolean> {
    return this.lib.isVisible(this.firstNameField);
  }

  async isMiddleNameVisible(): Promise<boolean> {
    return this.lib.isVisible(this.middleNameField);
  }

  async isSurnameVisible(): Promise<boolean> {
    return this.lib.isVisible(this.surnameField);
  }

  async isGenderVisible(): Promise<boolean> {
    return this.lib.isVisible(this.genderField);
  }

  async isDobVisible(): Promise<boolean> {
    return this.lib.isVisible(this.dobField);
  }

  async isTrustedPhoneVisible(): Promise<boolean> {
    return this.lib.isVisible(this.trustedPhoneField);
  }

  async isVninFieldVisible(): Promise<boolean> {
    return this.lib.isVisible(this.vninField);
  }

  async isVerifyButtonVisible(): Promise<boolean> {
    return this.lib.isVisible(this.verifyButton);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async fillVninForm(data: {
    firstName: string;
    middleName: string;
    surname: string;
    gender: string;
    dob: string;
    phone: string;
    vnin: string;
  }): Promise<void> {
    await this.lib.clearAndFill(this.firstNameField, data.firstName);
    await this.lib.clearAndFill(this.middleNameField, data.middleName);
    await this.lib.clearAndFill(this.surnameField, data.surname);
    try {
      await this.lib.selectOption(this.genderField, data.gender);
    } catch {
      await this.lib.clearAndFill(this.genderField, data.gender);
    }
    await this.lib.clearAndFill(this.dobField, data.dob);
    await this.lib.clearAndFill(this.trustedPhoneField, data.phone);
    await this.lib.clearAndFill(this.vninField, data.vnin);
  }

  async fillWithInvalidVnin(): Promise<void> {
    await this.lib.clearAndFill(this.firstNameField, 'Test');
    await this.lib.clearAndFill(this.middleNameField, 'Middle');
    await this.lib.clearAndFill(this.surnameField, 'User');
    try {
      await this.lib.selectOption(this.genderField, 'Male');
    } catch {
      await this.lib.clearAndFill(this.genderField, 'Male');
    }
    await this.lib.clearAndFill(this.dobField, '1990-01-15');
    await this.lib.clearAndFill(this.trustedPhoneField, '08012345678');
    await this.lib.clearAndFill(this.vninField, '00000000000'); // Invalid VNIN
  }

  async clickVerify(): Promise<void> {
    await this.lib.click(this.verifyButton);
    await this.page.waitForTimeout(3000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Query methods
  // ══════════════════════════════════════════════════════════════════════════

  async hasError(): Promise<boolean> {
    return this.lib.isVisible(this.errorMessage);
  }

  async hasSuccess(): Promise<boolean> {
    return this.lib.isVisible(this.successMessage);
  }

  async isValidationErrorVisible(): Promise<boolean> {
    return this.lib.isVisible(this.validationErrors);
  }

  async isVerifiedBadgeVisible(): Promise<boolean> {
    return this.lib.isVisible(this.verifiedBadge);
  }
}
