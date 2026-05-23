import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { RegistrationPage } from '../../pages/RegistrationPage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

// ─── Test data ────────────────────────────────────────────────────────────────

const FIRST_NAMES = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Quinn', 'Avery', 'Blake', 'Cameron'];
const LAST_NAMES  = ['Smith', 'Jones', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson'];

function generateCandidate() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName  = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const unique    = Math.random().toString(36).substring(2, 12);
  const email     = `testcandidate+${unique}@mailinator.com`;
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%&';
  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
    special[Math.floor(Math.random() * special.length)],
  ].sort(() => Math.random() - 0.5);
  return { firstName, lastName, email, password: chars.join('') };
}

type CandidateData = ReturnType<typeof generateCandidate>;

// ─── Per-scenario state ───────────────────────────────────────────────────────

interface RegState {
  candidateData?: CandidateData;
  xssDialogSeen?: boolean;
}
const state = new WeakMap<CustomWorld, RegState>();
function s(world: CustomWorld): RegState {
  if (!state.has(world)) state.set(world, {});
  return state.get(world)!;
}

// ─── Page factory ─────────────────────────────────────────────────────────────

function reg(world: CustomWorld): RegistrationPage {
  return new RegistrationPage(world.page);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GIVEN
// ═══════════════════════════════════════════════════════════════════════════════

Given('the Jobrator registration page is open', async function (this: CustomWorld) {
  const page = reg(this);
  await page.navigate();
  expect(await page.isLoaded(), 'Registration page failed to load — first name input not found').toBeTruthy();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  WHEN
// ═══════════════════════════════════════════════════════════════════════════════

When('the user fills in the registration form with random valid data',
  async function (this: CustomWorld) {
    const data = generateCandidate();
    s(this).candidateData = data;
    this.logMessage(`[Registration] Generated candidate: ${data.firstName} ${data.lastName} <${data.email}>`);
    await reg(this).fillAllFields(data.firstName, data.lastName, data.email, data.password);
  }
);

When('the user fills in the registration form with a known registered email',
  async function (this: CustomWorld) {
    const data = { ...generateCandidate(), email: envConfig.candidateEmail };
    s(this).candidateData = data;
    this.logMessage(`[Registration] Using existing email: ${data.email}`);
    await reg(this).fillAllFields(data.firstName, data.lastName, data.email, data.password);
  }
);

When('the user submits the registration form', async function (this: CustomWorld) {
  await reg(this).clickSubmit();
});

When('the user submits the registration form without filling any fields',
  async function (this: CustomWorld) {
    const page = reg(this);
    await page.checkTerms();
    await page.clickSubmit();
  }
);

When('the user enters a mismatched confirmation password', async function (this: CustomWorld) {
  const data = s(this).candidateData!;
  await reg(this).enterConfirmPassword(data.password + '_MISMATCH');
});

When('the user overrides the email with an invalid value {string}',
  async function (this: CustomWorld, invalidEmail: string) {
    await reg(this).enterEmail(invalidEmail);
  }
);

When('the user overrides the password with a too-short value {string}',
  async function (this: CustomWorld, shortPassword: string) {
    const page = reg(this);
    await page.enterPassword(shortPassword);
    await page.enterConfirmPassword(shortPassword);
  }
);

When('the user overrides the password with a plain value {string}',
  async function (this: CustomWorld, plainPassword: string) {
    const page = reg(this);
    await page.enterPassword(plainPassword);
    await page.enterConfirmPassword(plainPassword);
  }
);

When('the user fills in the registration form with the XSS payload {string} in the first name',
  async function (this: CustomWorld, xssPayload: string) {
    const data = generateCandidate();
    s(this).candidateData = data;
    s(this).xssDialogSeen = false;

    this.page.once('dialog', async (dialog) => {
      s(this).xssDialogSeen = true;
      await dialog.dismiss();
    });

    this.logMessage(`[Registration] XSS test — first name payload: ${xssPayload}`);

    const page = reg(this);
    await page.enterFirstName(xssPayload);
    await page.enterLastName(data.lastName);
    await page.enterEmail(data.email);
    await page.enterPassword(data.password);
    await page.enterConfirmPassword(data.password);
    await page.checkTerms();
  }
);

When('the user clicks the login link on the registration page', async function (this: CustomWorld) {
  await reg(this).clickLoginLink();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  THEN
// ═══════════════════════════════════════════════════════════════════════════════

Then('the registration should be successful', async function (this: CustomWorld) {
  let redirected = false;
  try {
    await this.page.waitForURL(
      (url: URL) => !url.href.includes('/register') && !url.href.includes('/signup'),
      { timeout: envConfig.navigationTimeout }
    );
    redirected = true;
  } catch { /* no redirect — fall through */ }

  if (redirected) {
    expect(this.page.url(), `Registration was not successful. Current URL: ${this.page.url()}`).not.toContain('/register');
    return;
  }

  const success = await reg(this).isRegistrationSuccessful();
  expect(success, `Registration was not successful. Current URL: ${this.page.url()}`).toBeTruthy();
});

Then('a registration error message should be displayed', async function (this: CustomWorld) {
  await this.page.locator('[class*="error"], [class*="alert"], [role="alert"], [data-testid="error-message"]')
    .first().waitFor({ timeout: envConfig.expectTimeout });
  expect(await reg(this).hasErrorMessage(), 'Expected a registration error message but none was visible').toBeTruthy();
});

Then('the user should remain on the registration page', async function (this: CustomWorld) {
  expect(reg(this).isOnRegistrationPage(), `Expected to remain on registration page but URL is: ${this.page.url()}`).toBeTruthy();
});

Then('the first name input field should be visible', async function (this: CustomWorld) {
  expect(await reg(this).isFirstNameInputVisible(), 'First name input is not visible on the registration page').toBeTruthy();
});

Then('the last name input field should be visible', async function (this: CustomWorld) {
  expect(await reg(this).isLastNameInputVisible(), 'Last name input is not visible on the registration page').toBeTruthy();
});

Then('the registration email input field should be visible', async function (this: CustomWorld) {
  expect(await reg(this).isEmailInputVisible(), 'Email input is not visible on the registration page').toBeTruthy();
});

Then('the registration password input field should be visible', async function (this: CustomWorld) {
  expect(await reg(this).isPasswordInputVisible(), 'Password input is not visible on the registration page').toBeTruthy();
});

Then('the confirm password input field should be visible', async function (this: CustomWorld) {
  expect(await reg(this).isConfirmPasswordInputVisible(), 'Confirm password input is not visible on the registration page').toBeTruthy();
});

Then('the registration submit button should be visible', async function (this: CustomWorld) {
  expect(await reg(this).isSubmitButtonVisible(), 'Submit button is not visible on the registration page').toBeTruthy();
});

Then('the login link should be visible on the registration page', async function (this: CustomWorld) {
  expect(await reg(this).isLoginLinkVisible(), 'Login link is not visible on the registration page').toBeTruthy();
});

Then('the registration password field should be of type password', async function (this: CustomWorld) {
  expect(await reg(this).getPasswordInputType(), 'Password field must have type="password"').toBe('password');
});

Then('the confirm password field should be of type password', async function (this: CustomWorld) {
  expect(await reg(this).getConfirmPasswordInputType(), 'Confirm password field must have type="password"').toBe('password');
});

Then('the registration page should be served over HTTPS', async function (this: CustomWorld) {
  reg(this).assertPageIsHttps();
});

Then('the XSS script should not have executed', async function (this: CustomWorld) {
  expect(s(this).xssDialogSeen, 'XSS script executed — a JavaScript dialog was triggered by the payload').toBeFalsy();
});

Then('the login page should be displayed', async function (this: CustomWorld) {
  const loginEmailInput = this.page.locator('input[name="email"], input[type="email"]').first();
  await loginEmailInput.waitFor({ timeout: envConfig.expectTimeout });
  expect(
    await loginEmailInput.isVisible(),
    `Expected the login form to be visible. Current URL: ${this.page.url()}`
  ).toBeTruthy();
});
