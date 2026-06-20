import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { EmployerRegistrationPage } from '../../pages/EmployerRegistrationPage';
import { EmployerLoginPage } from '../../pages/EmployerLoginPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

// ─── Test data ────────────────────────────────────────────────────────────────

const COMPANIES = ['TechCorp', 'Innovatech', 'NexaGroup', 'DigitalWave', 'FutureForce', 'CoreHire'];

function generateEmployer() {
  const companyName = `${COMPANIES[Math.floor(Math.random() * COMPANIES.length)]} Ltd`;
  const unique      = Math.random().toString(36).substring(2, 12);
  const email       = `testemployer+${unique}@mailinator.com`;
  const phone       = `+447${Math.floor(100000000 + Math.random() * 900000000)}`;
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
  return { email, companyName, phone, password: chars.join('') };
}

type EmployerData = ReturnType<typeof generateEmployer>;

// ─── Per-scenario state ───────────────────────────────────────────────────────

interface RegState {
  employerData?: EmployerData;
  xssDialogSeen?: boolean;
}
const state = new WeakMap<CustomWorld, RegState>();
function s(world: CustomWorld): RegState {
  if (!state.has(world)) state.set(world, {});
  return state.get(world)!;
}

function reg(world: CustomWorld): EmployerRegistrationPage {
  return new EmployerRegistrationPage(world.page);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GIVEN
// ═══════════════════════════════════════════════════════════════════════════════

Given('the Jobrator employer registration page is open', async function (this: CustomWorld) {
  const page = reg(this);
  await page.navigate();
  expect(
    await page.isLoaded(),
    'Employer registration page failed to load — first name input not found'
  ).toBeTruthy();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  WHEN
// ═══════════════════════════════════════════════════════════════════════════════

When('the user fills in the employer registration form with random valid data',
  async function (this: CustomWorld) {
    const data = generateEmployer();
    s(this).employerData = data;
    // Also expose on world for employer_login.steps cross-scenario use
    (this as unknown as Record<string, unknown>)['_employerData'] = data;
    this.logMessage(`[EmployerReg] Generated: <${data.email}> @ ${data.companyName}`);
    await reg(this).fillAllFields(data.companyName, data.phone, data.email, data.password);
  }
);

When('the user fills in the employer registration form with a known registered email',
  async function (this: CustomWorld) {
    const base = generateEmployer();
    const data = { ...base, email: envConfig.employerEmail || envConfig.candidateEmail };
    s(this).employerData = data;
    this.logMessage(`[EmployerReg] Using existing email: ${data.email}`);
    await reg(this).fillAllFields(data.companyName, data.phone, data.email, data.password);
  }
);

When('the user submits the employer registration form', async function (this: CustomWorld) {
  await reg(this).clickSubmit();
});

When('the user submits the employer registration form without filling any fields',
  async function (this: CustomWorld) {
    const page = reg(this);
    await page.checkTerms();
    await page.clickSubmit();
  }
);

When('the user enters a mismatched confirmation password in the employer form',
  async function (this: CustomWorld) {
    const data = s(this).employerData!;
    await reg(this).enterConfirmPassword(data.password + '_MISMATCH');
  }
);

When('the user overrides the employer email with an invalid value {string}',
  async function (this: CustomWorld, invalidEmail: string) {
    await reg(this).enterEmail(invalidEmail);
  }
);

When('the user clears the company name field', async function (this: CustomWorld) {
  await reg(this).clearCompanyName();
});

When('the user overrides the employer password with a too-short value {string}',
  async function (this: CustomWorld, shortPassword: string) {
    const page = reg(this);
    await page.enterPassword(shortPassword);
    await page.enterConfirmPassword(shortPassword);
  }
);

When('the user overrides the employer password with a plain value {string}',
  async function (this: CustomWorld, plainPassword: string) {
    const page = reg(this);
    await page.enterPassword(plainPassword);
    await page.enterConfirmPassword(plainPassword);
  }
);

When('the user fills in the employer registration form with the XSS payload {string} in the company name',
  async function (this: CustomWorld, xssPayload: string) {
    const data = generateEmployer();
    s(this).employerData = data;
    s(this).xssDialogSeen = false;

    this.page.once('dialog', async (dialog) => {
      s(this).xssDialogSeen = true;
      await dialog.dismiss();
    });

    this.logMessage(`[EmployerReg] XSS test — company name payload: ${xssPayload}`);

    const page = reg(this);
    await page.enterCompanyName(xssPayload);
    await page.enterPhone(data.phone);
    await page.enterEmail(data.email);
    await page.enterPassword(data.password);
    await page.enterConfirmPassword(data.password);
    await page.checkTerms();
  }
);

When('the user clicks the login link on the employer registration page',
  async function (this: CustomWorld) {
    await reg(this).clickLoginLink();
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
//  THEN
// ═══════════════════════════════════════════════════════════════════════════════

Then('the employer registration should be successful', async function (this: CustomWorld) {
  // Jobrator redirects to /login on successful employer registration
  try {
    await this.page.waitForURL(
      (url: URL) => !url.href.includes('/register'),
      { timeout: envConfig.navigationTimeout }
    );
  } catch { /* no redirect — fall through to fallback check */ }

  const url = this.page.url();
  const success = !url.includes('/register') || await reg(this).isRegistrationSuccessful();
  expect(success, `Employer registration was not successful. Current URL: ${url}`).toBeTruthy();
});

Then('an employer registration error message should be displayed',
  async function (this: CustomWorld) {
    await this.page.locator(
      '[class*="error"], [class*="alert"], [role="alert"], [data-testid="error-message"]'
    ).first().waitFor({ timeout: envConfig.expectTimeout });
    expect(
      await reg(this).hasErrorMessage(),
      'Expected an employer registration error message but none was visible'
    ).toBeTruthy();
  }
);

Then('the user should remain on the employer registration page',
  async function (this: CustomWorld) {
    expect(
      reg(this).isOnRegistrationPage(),
      `Expected to remain on employer registration page but URL is: ${this.page.url()}`
    ).toBeTruthy();
  }
);

// ── Field visibility ──────────────────────────────────────────────────────────

Then('the employer first name input field should be visible', async function (this: CustomWorld) {
  expect(
    await reg(this).isFirstNameInputVisible(),
    'Employer first name input is not visible'
  ).toBeTruthy();
});

Then('the employer last name input field should be visible', async function (this: CustomWorld) {
  expect(
    await reg(this).isLastNameInputVisible(),
    'Employer last name input is not visible'
  ).toBeTruthy();
});

Then('the employer email input field should be visible', async function (this: CustomWorld) {
  expect(
    await reg(this).isEmailInputVisible(),
    'Employer email input is not visible'
  ).toBeTruthy();
});

Then('the company name input field should be visible', async function (this: CustomWorld) {
  expect(
    await reg(this).isCompanyNameInputVisible(),
    'Company name input is not visible'
  ).toBeTruthy();
});

Then('the employer phone number input field should be visible', async function (this: CustomWorld) {
  expect(
    await reg(this).isPhoneInputVisible(),
    'Employer phone number input is not visible'
  ).toBeTruthy();
});

Then('the employer registration password input field should be visible',
  async function (this: CustomWorld) {
    expect(
      await reg(this).isPasswordInputVisible(),
      'Employer password input is not visible'
    ).toBeTruthy();
  }
);

Then('the employer confirm password input field should be visible',
  async function (this: CustomWorld) {
    expect(
      await reg(this).isConfirmPasswordInputVisible(),
      'Employer confirm password input is not visible'
    ).toBeTruthy();
  }
);

Then('the employer registration submit button should be visible',
  async function (this: CustomWorld) {
    expect(
      await reg(this).isSubmitButtonVisible(),
      'Employer registration submit button is not visible'
    ).toBeTruthy();
  }
);

Then('the login link should be visible on the employer registration page',
  async function (this: CustomWorld) {
    expect(
      await reg(this).isLoginLinkVisible(),
      'Login link is not visible on the employer registration page'
    ).toBeTruthy();
  }
);

// ── Security assertions ───────────────────────────────────────────────────────

Then('the employer registration password field should be of type password',
  async function (this: CustomWorld) {
    expect(
      await reg(this).getPasswordInputType(),
      'Employer password field must have type="password"'
    ).toBe('password');
  }
);

Then('the employer confirm password field should be of type password',
  async function (this: CustomWorld) {
    expect(
      await reg(this).getConfirmPasswordInputType(),
      'Employer confirm password field must have type="password"'
    ).toBe('password');
  }
);

Then('the employer registration page should be served over HTTPS',
  async function (this: CustomWorld) {
    reg(this).assertPageIsHttps();
  }
);

// ── E2E teardown ──────────────────────────────────────────────────────────────

When('the employer deletes their profile from the profile page',
  async function (this: CustomWorld) {
    const profilePage = new ProfilePage(this.page);
    await profilePage.navigate();
    expect(
      await profilePage.isDeleteProfileVisible(),
      '\'Delete Profile\' button was not found on the employer profile page'
    ).toBeTruthy();
    await profilePage.deleteProfile();
  }
);

Then('the deleted employer account should no longer be able to log in',
  async function (this: CustomWorld) {
    const data = s(this).employerData!;
    const loginPage = new EmployerLoginPage(this.page);
    await loginPage.navigate();
    await loginPage.login(data.email, data.password);
    await this.page.waitForTimeout(4000);
    this.logMessage(`[EmployerReg] Re-login attempt after deletion -> ${this.page.url()}`);
    expect(
      loginPage.isOnLoginPage(),
      `Deleted employer account was still able to authenticate — deletion did not take effect. URL: ${this.page.url()}`
    ).toBeTruthy();
  }
);
