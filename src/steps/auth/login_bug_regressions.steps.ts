import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();
const LOGIN_API = 'https://api.jobrator.com/api/login';

interface LoginApiResponse { status: number; body: string; }

async function postLogin(email: string, password: string): Promise<LoginApiResponse> {
  const res = await fetch(LOGIN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, profile: 'Candidate', loginMethod: 'email' }),
  });
  return { status: res.status, body: await res.text() };
}

function throwawayEmail(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@mailinator.com`;
}

// ─── Account-type choice (ADO-29456) ─────────────────────────────────────────

const accountTypeButton = (name: string) => `button:text-is("${name}")`;

Given('the Jobrator login page is opened without choosing an account type',
  async function (this: CustomWorld) {
    // LoginPage.navigate() picks the Candidate tab itself, which is exactly what
    // this check must not do, so the page is opened directly.
    await this.page.goto(`${envConfig.jobratorSite.replace(/\/$/, '')}/login`, { waitUntil: 'networkidle' });
    await this.page.locator('input[type="email"], input[name="email"]').first().waitFor();
  }
);

Then('neither the Candidate nor the Employer account type should be preselected',
  async function (this: CustomWorld) {
    const states = [];
    for (const name of ['Candidate', 'Employer']) {
      const button = this.page.locator(accountTypeButton(name)).first();
      states.push({
        name,
        pressed: await button.getAttribute('aria-pressed'),
        background: await button.evaluate(el => getComputedStyle(el).backgroundColor),
      });
    }
    this.logMessage(`[ADO-29456] account-type buttons: ${JSON.stringify(states)}`);
    for (const s of states) expect(s.pressed, `${s.name} is marked as pressed`).not.toBe('true');
    expect(states[0].background, 'Candidate and Employer are styled differently, so one looks selected')
      .toBe(states[1].background);
  }
);

When('the user submits the login form without choosing an account type',
  async function (this: CustomWorld) {
    await this.page.locator('input[type="email"], input[name="email"]').first().fill(throwawayEmail('no_type'));
    await this.page.locator('input[type="password"]').first().fill('Whatever#123');
    await this.page.locator('button[type="submit"]').first().click();
  }
);

Then('the user should be asked to select an account type', async function (this: CustomWorld) {
  const dialog = this.page.locator('.swal2-popup').filter({ visible: true });
  await expect(dialog).toContainText('Select account type', { timeout: 10000 });
  await expect(dialog).toContainText('Please select Candidate or Employer');
  await expect(this.page).toHaveURL(/\/login/);
});

// ─── Login API error responses (ADO-29981) ───────────────────────────────────

When('a wrong password is sent to the login API for the registered candidate',
  async function (this: CustomWorld) {
    // A freshly registered candidate, not the shared one: even one bad password adds to
    // the shared account's lockout count (ADO-29637), and if other scenarios have
    // already tripped it this answers 429 instead of the 401 under test.
    const { registerThrowawayCandidate } = await import('../../support/throwaway-accounts');
    const registered = await registerThrowawayCandidate();
    this.loginApiResponses.registered = [await postLogin(registered.email, 'NotThePassword#29981')];
  }
);

When('a wrong password is sent to the login API for an unregistered email',
  async function (this: CustomWorld) {
    this.loginApiResponses.unregistered = [await postLogin(throwawayEmail('unregistered'), 'NotThePassword#29981')];
  }
);

Then('both login API responses should be the same generic 401', async function (this: CustomWorld) {
  const [registered] = this.loginApiResponses.registered;
  const [unregistered] = this.loginApiResponses.unregistered;
  this.logMessage(`[ADO-29981] registered: ${registered.status} ${registered.body}`);
  this.logMessage(`[ADO-29981] unregistered: ${unregistered.status} ${unregistered.body}`);
  expect(registered.status).toBe(401);
  expect(unregistered.status).toBe(401);
  expect(registered.body, 'The two responses differ, so they reveal which email is registered')
    .toBe(unregistered.body);
});

Then('neither login API response should expose an exception code', async function (this: CustomWorld) {
  for (const key of ['registered', 'unregistered']) {
    const [{ body }] = this.loginApiResponses[key];
    expect(body).not.toMatch(/exception|E_INVALID_AUTH|mis-?match/i);
  }
});

// ─── Brute-force lockout (ADO-29637) ─────────────────────────────────────────

When('{int} wrong passwords are sent to the login API for a new throwaway email',
  async function (this: CustomWorld, attempts: number) {
    const email = throwawayEmail('bruteforce');
    const responses: LoginApiResponse[] = [];
    for (let i = 1; i <= attempts; i++) responses.push(await postLogin(email, `WrongPass#${i}`));
    this.logMessage(`[ADO-29637] ${responses.map(r => r.status).join(', ')}`);
    this.loginApiResponses.bruteForce = responses;
  }
);

Then('the last login API response should say there were too many login attempts',
  async function (this: CustomWorld) {
    const responses = this.loginApiResponses.bruteForce;
    const last = responses[responses.length - 1];
    expect(last.status, `Expected a lockout, got ${last.status} ${last.body}`).toBe(429);
    expect(last.body).toMatch(/too many login attempts/i);
  }
);
