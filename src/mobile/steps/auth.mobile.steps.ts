import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { MobileWorld } from '../support/mobile.world';
import { SignInScreen, Profile } from '../screens/SignInScreen';
import { MyJobsScreen } from '../screens/MyJobsScreen';
import { EnvConfig } from '../../config/env.config';

const env = EnvConfig.getInstance();

/**
 * The ADO repro steps use the placeholders "valid_email" / "valid_password"
 * rather than real values. Resolve them from .env so credentials stay out of
 * the feature files, and pass anything else through untouched.
 */
function resolveCredential(value: string, profile: Profile, kind: 'email' | 'password'): string {
  const isValid = /^valid_/.test(value);
  if (!isValid) return value;
  if (profile === 'Employer') {
    return kind === 'email' ? env.employerEmail : env.employerPassword;
  }
  return kind === 'email' ? env.candidateEmail : env.candidatePassword;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GIVEN
// ═══════════════════════════════════════════════════════════════════════════════

Given('the Jobrator mobile app is launched', async function (this: MobileWorld) {
  // The Before hook already created the session; this step documents intent and
  // gives the app a moment to finish its splash screen.
  await this.driver.pause(2000);
  this.logMessage('App launched.');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  WHEN — onboarding + sign in
// ═══════════════════════════════════════════════════════════════════════════════

When('user tap on the {string} Get Started button', async function (this: MobileWorld, profile: string) {
  const screen = new SignInScreen(this.driver);
  await screen.tapGetStarted(profile as Profile);
});

When('user navigate to {string} menu', async function (this: MobileWorld, menu: string) {
  const screen = new SignInScreen(this.driver);
  await screen.navigateToMenu(menu);
});

When('user select {string} signin option', async function (this: MobileWorld, profile: string) {
  const screen = new SignInScreen(this.driver);
  await screen.selectSignInOption(profile as Profile);
});

When(
  '{string} login with email {string} and password {string}',
  async function (this: MobileWorld, profile: string, email: string, password: string) {
    const screen = new SignInScreen(this.driver);
    await screen.enterCredentials(
      resolveCredential(email, profile as Profile, 'email'),
      resolveCredential(password, profile as Profile, 'password'),
    );
  },
);

When('user tap on signin button', async function (this: MobileWorld) {
  const screen = new SignInScreen(this.driver);
  await screen.tapSignIn();
});

When('user tap ok button on Login Modal prompt', async function (this: MobileWorld) {
  const screen = new SignInScreen(this.driver);
  const dismissed = await screen.dismissLoginModal();
  this.logMessage(dismissed ? 'Login modal dismissed.' : 'No login modal was shown.');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  THEN
// ═══════════════════════════════════════════════════════════════════════════════

Then('user should see my jobs screen', async function (this: MobileWorld) {
  const screen = new MyJobsScreen(this.driver);
  const visible = await screen.isAuthenticated();
  if (!visible) await this.attachScreenshot('my-jobs-not-visible');
  expect(
    visible,
    'Expected the My Jobs screen after signing in, but no authenticated screen was rendered.',
  ).toBe(true);
});

Then('user should see error on the login screen', async function (this: MobileWorld) {
  const screen = new SignInScreen(this.driver);
  const error = await screen.getAuthError();
  if (!error) await this.attachScreenshot('no-auth-error');
  expect(
    error.trim().length,
    'Expected a visible authentication error on the sign-in screen, but none was displayed.',
  ).toBeGreaterThan(0);
  this.logMessage(`Auth error shown: "${error.trim()}"`);
});

Then(
  'user should see an invalid credential modal',
  async function (this: MobileWorld) {
    const screen = new SignInScreen(this.driver);
    const error = await screen.getAuthError();
    if (!error) await this.attachScreenshot('no-invalid-credential-modal');
    expect(
      error.trim().length,
      'Expected an invalid-credential modal/message after submitting bad credentials.',
    ).toBeGreaterThan(0);
    this.logMessage(`Invalid-credential message: "${error.trim()}"`);
  },
);

Then('user should remain on the sign in screen', async function (this: MobileWorld) {
  const screen = new SignInScreen(this.driver);
  expect(
    await screen.isLoaded(),
    'Expected to remain on the sign-in screen after a failed login.',
  ).toBe(true);
});
