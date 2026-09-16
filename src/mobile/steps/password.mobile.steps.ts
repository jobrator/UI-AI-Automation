import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { MobileWorld } from '../support/mobile.world';
import { MoreMenuScreen } from '../screens/MoreMenuScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { EnvConfig } from '../../config/env.config';

const env = EnvConfig.getInstance();

/**
 * Resolve the repro's placeholders. "valid_password" is the account's current
 * password; "random_password" is generated once per scenario and remembered so
 * the confirm step and the revert step agree on the value.
 */
function resolvePassword(world: MobileWorld, token: string): string {
  if (/^valid_/.test(token)) {
    return world.throwawayPassword ?? env.candidatePassword;
  }
  if (/^random_/.test(token)) {
    if (!world.newPassword) {
      world.newPassword = `Mob@${Date.now().toString(36).toUpperCase()}1!`;
    }
    return world.newPassword;
  }
  return token;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Change password — ADO #29944
// ═══════════════════════════════════════════════════════════════════════════════

When('user tap on the Change Password option', async function (this: MobileWorld) {
  await new MoreMenuScreen(this.driver).openChangePassword();
  // Remember the starting password so the revert step can restore it.
  this.originalPassword = this.throwawayPassword ?? env.candidatePassword;
});

When('user enter current password {string}', async function (this: MobileWorld, token: string) {
  await new ChangePasswordScreen(this.driver).enterCurrentPassword(resolvePassword(this, token));
});

When('user enter new password {string}', async function (this: MobileWorld, token: string) {
  await new ChangePasswordScreen(this.driver).enterNewPassword(resolvePassword(this, token));
});

When('user confirm new password {string}', async function (this: MobileWorld, token: string) {
  await new ChangePasswordScreen(this.driver).confirmNewPassword(resolvePassword(this, token));
});

When('user tap on the Update Password button', async function (this: MobileWorld) {
  await new ChangePasswordScreen(this.driver).submit();
});

Then('user should see password updated successfully popup', async function (this: MobileWorld) {
  const screen = new ChangePasswordScreen(this.driver);
  const ok = await screen.isSuccessVisible();
  if (!ok) {
    await this.attachScreenshot('password-change-no-confirmation');
    const err = await screen.getError();
    if (err) await this.attachText(`Error shown instead: ${err}`);
  }
  expect(ok, 'Expected a "password updated successfully" popup after changing the password.').toBe(
    true,
  );
});

Then('user revert password back to the original', async function (this: MobileWorld) {
  const original = this.originalPassword;
  const current = this.newPassword;

  if (!original || !current) {
    throw new Error('Cannot revert: the original / new password was never recorded.');
  }

  const screen = new ChangePasswordScreen(this.driver);
  await screen.changePassword(current, original);

  const reverted = await screen.isSuccessVisible();
  expect(
    reverted,
    'Failed to revert the password — the account is left on the temporary password. ' +
      `Temporary password was: ${current}`,
  ).toBe(true);

  this.logMessage('Password reverted to the original value.');
});
