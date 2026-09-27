import { BaseScreen } from './BaseScreen';
import { Locators } from '../lib/Locators';

/**
 * ChangePasswordScreen — More → Change Password (ADO #29944).
 *
 * The repro's final step is "user revert password back to the original", which
 * only makes sense against a throwaway account. Per the suite's standing rule,
 * scenarios that change credentials must never touch the shared .env account —
 * see the @requires-throwaway-candidate tag.
 */
export class ChangePasswordScreen extends BaseScreen {
  private readonly currentPassword = Locators.any(
    Locators.accessibilityId('current-password-input'),
    Locators.secureInput(0),
  );
  private readonly newPassword = Locators.any(
    Locators.accessibilityId('new-password-input'),
    Locators.secureInput(1),
  );
  private readonly confirmPassword = Locators.any(
    Locators.accessibilityId('confirm-password-input'),
    Locators.secureInput(2),
  );
  private readonly updateButton = this.control('update-password-button', 'Update Password');
  private readonly successPopup = Locators.any(
    Locators.accessibilityId('password-updated'),
    Locators.partialText('updated successfully'),
    Locators.partialText('Updated Successfully'),
    Locators.partialText('Success'),
  );
  private readonly errorMessage = Locators.any(
    Locators.accessibilityId('password-error'),
    Locators.partialText('incorrect'),
    Locators.partialText('do not match'),
    Locators.partialText('Invalid'),
  );

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.updateButton, 10000);
  }

  async enterCurrentPassword(value: string): Promise<void> {
    await this.lib.type(this.currentPassword, value, 'current password');
  }

  async enterNewPassword(value: string): Promise<void> {
    await this.lib.type(this.newPassword, value, 'new password');
  }

  async confirmNewPassword(value: string): Promise<void> {
    await this.lib.type(this.confirmPassword, value, 'confirm password');
  }

  async submit(): Promise<void> {
    await this.lib.scrollTo('Update Password');
    await this.lib.tap(this.updateButton, 'Update Password button');
  }

  async isSuccessVisible(): Promise<boolean> {
    return this.lib.isVisible(this.successPopup, 20000);
  }

  async getError(): Promise<string> {
    const el = await this.lib.resolve(this.errorMessage, 8000);
    return el ? ((await el.getText().catch(() => '')) ?? '') : '';
  }

  /** Change the password and confirm — used to revert at the end of a scenario. */
  async changePassword(current: string, next: string): Promise<void> {
    await this.enterCurrentPassword(current);
    await this.enterNewPassword(next);
    await this.confirmNewPassword(next);
    await this.submit();
    await this.lib.confirmDialog();
  }
}
