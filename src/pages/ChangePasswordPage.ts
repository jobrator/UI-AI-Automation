import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { EnvConfig } from '../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * ChangePasswordPage — Page Object for /dashboard/change-password
 */
export class ChangePasswordPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly currentPasswordField =
    'input[name="oldPassword"], input[name="current_password"], input[name="old_password"], ' +
    'input[name="password_current"], input[placeholder*="current" i], ' +
    'input[placeholder*="old password" i], [data-testid="current-password"], ' +
    '#current_password, #old_password';

  private readonly newPasswordField =
    'input[name="newPassword"], input[name="new_password"], input[name="password_new"], ' +
    'input[placeholder*="new password" i], input[placeholder*="New Password" i], ' +
    '[data-testid="new-password"], #new_password';

  private readonly confirmPasswordField =
    'input[name="confirmPassword"], input[name="new_password_confirmation"], ' +
    'input[name="password_confirmation"], input[name="confirm_password"], ' +
    'input[placeholder*="confirm" i], input[placeholder*="Confirm Password" i], ' +
    '[data-testid="confirm-password"], #new_password_confirmation, #confirm_password, ' +
    '#password_confirmation';

  private readonly saveButton =
    'button[type="submit"]:has-text("Save"), button:has-text("Change Password"), ' +
    'button:has-text("Update Password"), input[type="submit"][value*="Save" i], ' +
    '[data-testid="save-password"], button:has-text("Update"), button:has-text("Submit")';

  private readonly errorMessage =
    '.alert-danger, .error-message, [class*="error"], .invalid-feedback, ' +
    '[role="alert"]:not([class*="success"]), .text-danger, .swal2-error, ' +
    '[data-testid="error-message"], *:has-text("incorrect"), *:has-text("wrong password"), ' +
    '*:has-text("does not match"), *:has-text("Invalid")';

  private readonly successMessage =
    '.alert-success, .success-message, .swal2-success, [class*="success"], ' +
    '[role="alert"]:has-text("success"), .toast-success, ' +
    '[data-testid="success-message"], *:has-text("Password changed"), ' +
    '*:has-text("updated successfully"), *:has-text("password has been")';

  private readonly complexityError =
    '.password-strength, .complexity-error, [class*="password-error"], ' +
    '*:has-text("weak"), *:has-text("complexity"), *:has-text("requirements"), ' +
    '*:has-text("at least"), .invalid-feedback, .text-danger';

  private readonly mismatchError =
    '[class*="mismatch"], *:has-text("do not match"), *:has-text("don\'t match"), ' +
    '*:has-text("confirmation"), .invalid-feedback, .text-danger, ' +
    '[data-testid="mismatch-error"]';

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
    await this.lib.navigateTo(this.url('/dashboard/change-password'));
    await this.page.waitForTimeout(1500);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('domcontentloaded');
    return (
      (await this.lib.isVisible(this.currentPasswordField)) ||
      (await this.lib.isVisible(this.newPasswordField)) ||
      (await this.lib.isVisible(this.saveButton))
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Field visibility checks
  // ══════════════════════════════════════════════════════════════════════════

  async isCurrentPasswordVisible(): Promise<boolean> {
    return this.lib.isVisible(this.currentPasswordField);
  }

  async isNewPasswordVisible(): Promise<boolean> {
    return this.lib.isVisible(this.newPasswordField);
  }

  async isConfirmPasswordVisible(): Promise<boolean> {
    return this.lib.isVisible(this.confirmPasswordField);
  }

  async isSaveButtonVisible(): Promise<boolean> {
    return this.lib.isVisible(this.saveButton);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async fillCurrentPassword(password: string): Promise<void> {
    await this.lib.clearAndFill(this.currentPasswordField, password);
  }

  async fillNewPassword(password: string): Promise<void> {
    await this.lib.clearAndFill(this.newPasswordField, password);
  }

  async fillConfirmPassword(password: string): Promise<void> {
    await this.lib.clearAndFill(this.confirmPasswordField, password);
  }

  async fillChangePasswordForm(
    current: string,
    newPass: string,
    confirm: string
  ): Promise<void> {
    await this.fillCurrentPassword(current);
    await this.fillNewPassword(newPass);
    await this.fillConfirmPassword(confirm);
  }

  async fillCorrectCurrentPassword(): Promise<void> {
    await this.fillCurrentPassword(envConfig.candidatePassword);
  }

  async fillIncorrectCurrentPassword(): Promise<void> {
    await this.fillCurrentPassword('WrongPassword!999');
  }

  async fillValidNewPassword(): Promise<void> {
    const validPass = 'NewP@ssword123!';
    await this.fillNewPassword(validPass);
    await this.fillConfirmPassword(validPass);
  }

  async fillWeakPassword(password: string): Promise<void> {
    await this.fillNewPassword(password);
    await this.fillConfirmPassword(password);
  }

  async fillMismatchedConfirmation(): Promise<void> {
    // New password was already set in the previous step — fill a different confirmation
    await this.fillConfirmPassword('TotallyDifferentP@ss999!');
  }

  async clickSave(): Promise<void> {
    await this.lib.click(this.saveButton);
    await this.page.waitForTimeout(2000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Query methods
  // ══════════════════════════════════════════════════════════════════════════

  async getError(): Promise<string> {
    try {
      await this.page.locator(this.errorMessage).first().waitFor({ state: 'visible', timeout: 5000 });
      return this.lib.getText(this.errorMessage);
    } catch {
      return '';
    }
  }

  async getSuccess(): Promise<string> {
    try {
      await this.page.locator(this.successMessage).first().waitFor({ state: 'visible', timeout: 5000 });
      return this.lib.getText(this.successMessage);
    } catch {
      return '';
    }
  }

  async isErrorVisible(): Promise<boolean> {
    try {
      await this.page.locator(this.errorMessage).first().waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isSuccessVisible(): Promise<boolean> {
    try {
      await this.page.locator(this.successMessage).first().waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isComplexityErrorVisible(): Promise<boolean> {
    return this.lib.isVisible(this.complexityError);
  }

  async isMismatchErrorVisible(): Promise<boolean> {
    return this.lib.isVisible(this.mismatchError);
  }
}
