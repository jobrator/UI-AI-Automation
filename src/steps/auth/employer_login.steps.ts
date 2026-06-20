import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { EmployerLoginPage } from '../../pages/EmployerLoginPage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

function getPage(world: CustomWorld): EmployerLoginPage {
  return new EmployerLoginPage(world.page);
}

// ─── Employer-specific Given ──────────────────────────────────────────────────

Given('the Jobrator employer login page is open', async function (this: CustomWorld) {
  const loginPage = getPage(this);
  await loginPage.navigate();
  const loaded = await loginPage.isLoaded();
  expect(loaded, 'Employer login page failed to load — email input not found').toBeTruthy();
});

Given('an unauthenticated user navigates directly to the employer dashboard',
  async function (this: CustomWorld) {
    await this.page.goto(`${envConfig.jobratorSite}employer/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: envConfig.navigationTimeout
    });
  }
);

Given('the authenticated employer navigates directly to the login page',
  async function (this: CustomWorld) {
    // @requires-employer-login hook already logged the employer in before this step
    await getPage(this).navigate();
  }
);

// ─── When ─────────────────────────────────────────────────────────────────────

When('the user enters the registered employer email', async function (this: CustomWorld) {
  await getPage(this).enterEmail(envConfig.employerEmail);
});

When('the user enters the registered employer password', async function (this: CustomWorld) {
  await getPage(this).enterPassword(envConfig.employerPassword);
});

When('the user enters the registered employer password in wrong case', async function (this: CustomWorld) {
  await getPage(this).enterPassword(envConfig.employerPassword.toLowerCase());
});

When('the employer logs in with the newly registered account',
  async function (this: CustomWorld) {
    // Populated by employer_registration.steps.ts via shared state key
    const data = (this as unknown as Record<string, unknown>)['_employerData'] as
      { email: string; password: string } | undefined;
    if (!data) throw new Error('No employer registration data found — run the registration step first');
    const loginPage = getPage(this);
    await loginPage.navigate();
    await loginPage.login(data.email, data.password);
    await this.page.waitForTimeout(4000);
    this.logMessage(`[EmployerLogin] Logged in as ${data.email} -> ${this.page.url()}`);
    expect(
      loginPage.isOnLoginPage(),
      `Newly registered employer account could not log in. URL: ${this.page.url()}`
    ).toBeFalsy();
  }
);

// ─── Employer-specific Then ───────────────────────────────────────────────────

Then('the user should be redirected to the employer dashboard',
  async function (this: CustomWorld) {
    await this.page.waitForURL(
      /employer|recruiter|post-job|manage-job|dashboard|home|jobs/,
      { timeout: envConfig.navigationTimeout }
    );
    await this.page.waitForLoadState('networkidle');
    const url = this.page.url();
    expect(
      url.match(/employer|recruiter|post-job|manage-job|dashboard|home|jobs/i),
      `Expected employer dashboard but URL is: ${url}`
    ).toBeTruthy();
  }
);

Then('the employer profile menu should be visible', async function (this: CustomWorld) {
  const visible = await getPage(this).isEmployerMenuVisible();
  expect(visible, 'Employer profile menu should be visible after successful login').toBeTruthy();
});

Then('they should be redirected to the employer dashboard', async function (this: CustomWorld) {
  try {
    await this.page.waitForURL(/employer|recruiter|post-job|dashboard|home|jobs/, {
      timeout: envConfig.defaultTimeout
    });
    return;
  } catch {
    const logoutVisible = await this.page
      .locator('a:has-text("Logout"), a.theme-btn:has-text("Logout")')
      .first().isVisible().catch(() => false);
    expect(
      logoutVisible,
      'Expected authenticated employer to be on the employer dashboard or remain logged in'
    ).toBeTruthy();
  }
});
