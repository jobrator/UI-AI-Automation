import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { ChangePasswordPage } from '../../pages/ChangePasswordPage';
import { EnvConfig } from '../../config/env.config';

// ─── Page Object factory ────────────────────────────────────────────────────

function getPage(world: CustomWorld): ChangePasswordPage {
  return new ChangePasswordPage(world.page);
}

// ─── State storage for the new password across steps ─────────────────────────
// This allows the "confirms the new password" step to use the same value set
// by "enters a valid new password".
const newPasswords = new Map<string, string>();

function scenarioKey(world: CustomWorld): string {
  return world.scenarioMeta?.name ?? 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
//  GIVEN — Preconditions
// ═══════════════════════════════════════════════════════════════════════════

Given('the authenticated candidate navigates to the Change Password page',
  async function (this: CustomWorld) {
    // The @requires-candidate-login hook has already logged the candidate in.
    const page = getPage(this);
    await page.navigate();
    this.logMessage(`[ChangePassword] Navigated. URL: ${this.page.url()}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  THEN — Field visibility assertions
// ═══════════════════════════════════════════════════════════════════════════

Then('the Current Password field should be visible on the change password page',
  async function (this: CustomWorld) {
    const visible = await getPage(this).isCurrentPasswordVisible();
    expect(visible, 'Current Password field is not visible on the change password page').toBeTruthy();
  }
);

Then('the New Password field should be visible on the change password page',
  async function (this: CustomWorld) {
    const visible = await getPage(this).isNewPasswordVisible();
    expect(visible, 'New Password field is not visible on the change password page').toBeTruthy();
  }
);

Then('the Confirm New Password field should be visible on the change password page',
  async function (this: CustomWorld) {
    const visible = await getPage(this).isConfirmPasswordVisible();
    expect(visible, 'Confirm New Password field is not visible on the change password page').toBeTruthy();
  }
);

Then('the Save button should be visible on the change password page',
  async function (this: CustomWorld) {
    const visible = await getPage(this).isSaveButtonVisible();
    expect(visible, 'Save button is not visible on the change password page').toBeTruthy();
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  WHEN — Form fill actions
// ═══════════════════════════════════════════════════════════════════════════

When('the candidate enters the correct current password',
  async function (this: CustomWorld) {
    // Use throwaway account password if this scenario created one; otherwise use shared env credentials.
    const pwd = this.freshCandidatePassword ?? EnvConfig.getInstance().candidatePassword;
    await getPage(this).fillCurrentPassword(pwd);
    this.logMessage('[ChangePassword] Correct current password entered');
  }
);

When('the candidate enters an incorrect current password',
  async function (this: CustomWorld) {
    await getPage(this).fillIncorrectCurrentPassword();
    this.logMessage('[ChangePassword] Incorrect current password entered');
  }
);

When('the candidate enters a valid new password',
  async function (this: CustomWorld) {
    const newPass = `Secure@Pass${Date.now().toString().slice(-4)}!`;
    newPasswords.set(scenarioKey(this), newPass);
    await getPage(this).fillNewPassword(newPass);
    this.logMessage('[ChangePassword] Valid new password entered');
  }
);

When('the candidate confirms the new password',
  async function (this: CustomWorld) {
    const newPass = newPasswords.get(scenarioKey(this)) ?? 'Secure@Pass1234!';
    await getPage(this).fillConfirmPassword(newPass);
    this.logMessage('[ChangePassword] New password confirmed');
  }
);

When('the candidate enters a weak new password {string}',
  async function (this: CustomWorld, weakPassword: string) {
    newPasswords.set(scenarioKey(this), weakPassword);
    await getPage(this).fillWeakPassword(weakPassword);
    this.logMessage(`[ChangePassword] Weak password entered: "${weakPassword}"`);
  }
);

When('the candidate enters a different value in the confirm password field',
  async function (this: CustomWorld) {
    await getPage(this).fillMismatchedConfirmation();
    this.logMessage('[ChangePassword] Mismatched confirmation password entered');
  }
);

When('the candidate clicks the Save button on the change password page',
  async function (this: CustomWorld) {
    await getPage(this).clickSave();
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  THEN — Result assertions
// ═══════════════════════════════════════════════════════════════════════════

Then('the password should be updated',
  async function (this: CustomWorld) {
    const success = await getPage(this).isSuccessVisible();
    if (!success) {
      const error = await getPage(this).getError();
      this.logMessage(`[ChangePassword] Error returned: "${error}"`);
    }
    expect(
      success,
      'Expected the password to be updated (success message) but none was displayed'
    ).toBeTruthy();
    // Throwaway account — no restore needed. Shared credentials are never modified.
  }
);

Then('an error message should be displayed indicating the current password is wrong',
  async function (this: CustomWorld) {
    const errorVisible = await getPage(this).isErrorVisible();
    expect(
      errorVisible,
      'Expected an error message for incorrect current password but none was displayed'
    ).toBeTruthy();
    const errorText = await getPage(this).getError();
    this.logMessage(`[ChangePassword] Error message: "${errorText}"`);
  }
);

Then('a password complexity validation error should be displayed',
  async function (this: CustomWorld) {
    const complexityError = await getPage(this).isComplexityErrorVisible();
    const genericError = await getPage(this).isErrorVisible();
    expect(
      complexityError || genericError,
      'Expected a password complexity validation error but none was displayed'
    ).toBeTruthy();
  }
);

Then('a password mismatch validation error should be displayed',
  async function (this: CustomWorld) {
    const mismatchError = await getPage(this).isMismatchErrorVisible();
    const genericError = await getPage(this).isErrorVisible();
    expect(
      mismatchError || genericError,
      'Expected a password mismatch validation error but none was displayed'
    ).toBeTruthy();
  }
);
