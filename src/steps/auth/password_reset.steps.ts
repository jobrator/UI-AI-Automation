import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { Page } from 'playwright';
import { CustomWorld } from '../../support/world';
import { PasswordResetPage } from '../../pages/PasswordResetPage';
import { RegistrationPage } from '../../pages/RegistrationPage';
import { LoginPage } from '../../pages/LoginPage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

// ─── Test data helpers (mirrors registration.steps.ts) ────────────────────────

const FIRST_NAMES = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Quinn', 'Avery', 'Blake', 'Cameron'];
const LAST_NAMES  = ['Smith', 'Jones', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson'];

function generateCandidate() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName  = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const unique    = Math.random().toString(36).substring(2, 12);
  const email     = `jobratortest${unique}@mailinator.com`;
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

interface PrState {
  candidate?: CandidateData;
  mailinatorTab?: Page;
  newPassword?: string;
}

const state = new WeakMap<CustomWorld, PrState>();
function s(world: CustomWorld): PrState {
  if (!state.has(world)) state.set(world, {});
  return state.get(world)!;
}

// ─── Page factories ───────────────────────────────────────────────────────────

function pr(world: CustomWorld): PasswordResetPage {
  return new PasswordResetPage(world.page);
}

function reg(world: CustomWorld): RegistrationPage {
  return new RegistrationPage(world.page);
}

function lp(world: CustomWorld): LoginPage {
  return new LoginPage(world.page);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Background
// ═══════════════════════════════════════════════════════════════════════════════

Given('a new candidate account is registered with a temporary Mailinator email',
  { timeout: 180000 },
  async function (this: CustomWorld) {
    const data = generateCandidate();
    s(this).candidate = data;
    this.logMessage(`[PasswordReset] Registering temp candidate: ${data.firstName} ${data.lastName} <${data.email}>`);

    // Use networkidle so Angular/JS finishes rendering before we click the Register modal trigger
    const loginUrl = `${envConfig.jobratorSite.replace(/\/$/, '')}/login`;
    await this.page.goto(loginUrl, { waitUntil: 'networkidle', timeout: envConfig.navigationTimeout });
    await this.page.locator('a.call-modal:has-text("Register")').first().click();
    await this.page.locator('input[name="candidateFirstName"]').first()
      .waitFor({ state: 'visible', timeout: 15000 });

    await reg(this).fillAllFields(data.firstName, data.lastName, data.email, data.password);
    await reg(this).clickSubmit();

    // Open Mailinator now and wait for the welcome email — confirms the account exists
    const resetPage = pr(this);
    const mailinatorTab = await resetPage.openMailinatorInbox(data.email);
    s(this).mailinatorTab = mailinatorTab;
    await resetPage.waitForWelcomeEmail(mailinatorTab);

    // Return focus to the app tab
    await this.page.bringToFront();
    this.logMessage(`[PasswordReset] Account confirmed. Returned to app tab. URL: ${this.page.url()}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
//  When — forgot password flow
// ═══════════════════════════════════════════════════════════════════════════════

When('the candidate enters the registered temporary email in the forgot password form',
  async function (this: CustomWorld) {
    const data = s(this).candidate!;
    await pr(this).enterForgotEmail(data.email);
    this.logMessage(`[PasswordReset] Entered email: ${data.email}`);
  }
);

When('the candidate submits the forgot password form', async function (this: CustomWorld) {
  await pr(this).submitForgotForm();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Then — confirmation
// ═══════════════════════════════════════════════════════════════════════════════

Then('a confirmation message should be shown on the forgot password page',
  async function (this: CustomWorld) {
    const visible = await pr(this).isConfirmationVisible();
    expect(visible, 'Expected a confirmation message after submitting the forgot password form').toBeTruthy();
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
//  When — Mailinator inbox
// ═══════════════════════════════════════════════════════════════════════════════

When('the candidate opens the Mailinator inbox in a new tab',
  async function (this: CustomWorld) {
    const mailinatorTab = s(this).mailinatorTab!;
    await mailinatorTab.bringToFront();
    this.logMessage('[PasswordReset] Switched to existing Mailinator tab');
  }
);

When('the candidate opens the Jobrator password reset email',
  { timeout: 180000 },
  async function (this: CustomWorld) {
    const mailinatorTab = s(this).mailinatorTab!;
    await pr(this).waitForAndClickResetEmail(mailinatorTab);
  }
);

When('the candidate follows the password reset link in the email',
  { timeout: 90000 },
  async function (this: CustomWorld) {
    const mailinatorTab = s(this).mailinatorTab!;
    const resetLink = await pr(this).extractResetLink(mailinatorTab);

    await mailinatorTab.close();
    s(this).mailinatorTab = undefined;

    await pr(this).navigateToResetLink(resetLink);
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
//  When — set new password and log in
// ═══════════════════════════════════════════════════════════════════════════════

When('the candidate sets a new password on the reset page',
  async function (this: CustomWorld) {
    const newPassword = generateCandidate().password;
    s(this).newPassword = newPassword;
    await pr(this).setNewPassword(newPassword);
  }
);

When('the candidate logs in with the new password on the login page',
  async function (this: CustomWorld) {
    const data = s(this).candidate!;
    const newPassword = s(this).newPassword!;

    await lp(this).navigate();
    await lp(this).login(data.email, newPassword);
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
//  Then — post-reset assertions
// ═══════════════════════════════════════════════════════════════════════════════

Then('the candidate should be redirected to the dashboard after password reset',
  async function (this: CustomWorld) {
    await this.page.waitForURL(/dashboard|home|candidate|profile|jobs|application/i, {
      timeout: envConfig.navigationTimeout
    });
    const url = this.page.url();
    expect(
      url.match(/dashboard|home|candidate|profile|jobs|application/i),
      `Expected to land on the dashboard after password reset login, but URL was: ${url}`
    ).toBeTruthy();
  }
);
