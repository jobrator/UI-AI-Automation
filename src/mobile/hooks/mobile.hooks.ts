import {
  Before,
  After,
  BeforeAll,
  AfterAll,
  AfterStep,
  Status,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { remote } from 'webdriverio';
import * as path from 'path';
import * as fs from 'fs';
import { MobileWorld } from '../support/mobile.world';
import { MobileConfig } from '../config/mobile.config';
import { MobileLibrary } from '../lib/MobileLibrary';
import { EnvConfig } from '../../config/env.config';

const mobileCfg = MobileConfig.getInstance();
const envCfg = EnvConfig.getInstance();

// Appium sessions are much slower to start than a browser context.
setDefaultTimeout(parseInt(process.env.MOBILE_STEP_TIMEOUT || '120000', 10));

// ─── BeforeAll ────────────────────────────────────────────────────────────────

BeforeAll(async function () {
  const c = mobileCfg.raw;
  console.log('\n════════════════════════════════════════════════════');
  console.log('  Jobrator Mobile E2E — Test Run Starting');
  console.log(`  Platform : ${c.platform}`);
  console.log(`  Device   : ${c.deviceName}${c.udid ? ` (${c.udid})` : ''}`);
  console.log(`  Appium   : http://${c.appiumHost}:${c.appiumPort}${c.appiumPath}`);
  console.log(`  App      : ${c.appPath || c.appPackage || c.bundleId || '(not configured)'}`);
  console.log('════════════════════════════════════════════════════\n');

  mobileCfg.assertAppConfigured();

  fs.mkdirSync(path.join(envCfg.reportDir, 'mobile', 'screenshots'), { recursive: true });
});

// ─── AfterAll ─────────────────────────────────────────────────────────────────

AfterAll(async function () {
  console.log('\n════════════════════════════════════════════════════');
  console.log('  Mobile Test Run Complete');
  console.log('════════════════════════════════════════════════════\n');
});

// ─── Before (per scenario) ────────────────────────────────────────────────────

Before(async function (this: MobileWorld, scenario) {
  this.scenarioName = scenario.pickle.name;
  this.startTime = new Date();
  const tags = scenario.pickle.tags.map((t) => t.name);

  this.logMessage(`Starting scenario: "${this.scenarioName}" [${tags.join(', ')}]`);

  this.driver = await remote({
    ...mobileCfg.connection,
    capabilities: mobileCfg.capabilities,
  });

  this.lib = new MobileLibrary(this.driver);
});

// ─── After (per scenario) ─────────────────────────────────────────────────────

After(async function (this: MobileWorld, scenario) {
  const status = scenario.result?.status;
  const isFailed = status === Status.FAILED;

  if (isFailed && this.driver) {
    await this.attachScreenshot(`FAILED_${this.scenarioName}`);
    try {
      const source = await this.driver.getPageSource();
      const file = path.join(
        envCfg.reportDir,
        'mobile',
        `${sanitize(this.scenarioName)}.pagesource.xml`,
      );
      fs.writeFileSync(file, source);
      this.logMessage(`Page source saved → ${file}`);
      await this.attachText(
        `Platform: ${this.platform}\nScenario: ${this.scenarioName}\nPage source: ${file}`,
      );
    } catch (e) {
      console.warn(`[MobileHooks] Could not capture page source: ${(e as Error).message}`);
    }
  }

  try {
    if (this.driver) await this.driver.deleteSession();
  } catch (e) {
    console.warn(`[MobileHooks] Session cleanup error: ${(e as Error).message}`);
  }

  const duration = `${Date.now() - this.startTime.getTime()}ms`;
  this.logMessage(`Scenario "${this.scenarioName}" → ${status?.toUpperCase()} (${duration})`);
});

// ─── AfterStep ────────────────────────────────────────────────────────────────

AfterStep(async function (this: MobileWorld, step) {
  if (step.result?.status === Status.FAILED) {
    console.error(`[MobileHooks] Step FAILED: "${step.pickleStep.text}"`);
  }
});

// ─── Tagged hooks ─────────────────────────────────────────────────────────────

/**
 * Sign in as the shared candidate before the scenario body runs, for scenarios
 * whose subject is a post-login screen rather than sign-in itself.
 */
Before({ tags: '@requires-candidate-login' }, async function (this: MobileWorld) {
  const { SignInScreen } = await import('../screens/SignInScreen');
  const signIn = new SignInScreen(this.driver);
  await signIn.signInAsCandidate(envCfg.candidateEmail, envCfg.candidatePassword);
  this.logMessage('Pre-condition: candidate signed in (@requires-candidate-login).');
});

/** Sign in as the shared employer. */
Before({ tags: '@requires-employer-login' }, async function (this: MobileWorld) {
  const { SignInScreen } = await import('../screens/SignInScreen');
  const signIn = new SignInScreen(this.driver);
  await signIn.signInAsEmployer(envCfg.employerEmail, envCfg.employerPassword);
  this.logMessage('Pre-condition: employer signed in (@requires-employer-login).');
});

/**
 * For scenarios that permanently alter credentials (the change-password repro
 * ends by reverting, but a mid-scenario failure would leave the account on the
 * temporary password). The shared .env candidate must never be mutated.
 *
 * The app has no registration screen in the ADO repro steps, so the throwaway
 * account is created through the web registration flow — the same one the
 * Playwright suite uses — and the mobile app then signs in as that account.
 * Registering over the web keeps this hook fast and avoids inventing a mobile
 * sign-up journey that has not been specified.
 */
Before({ tags: '@requires-throwaway-candidate' }, async function (this: MobileWorld) {
  const { chromium } = await import('playwright');
  const { RegistrationPage } = await import('../../pages/RegistrationPage');
  const { SignInScreen } = await import('../screens/SignInScreen');

  const uid = Date.now().toString(36);
  const email = `mobilechgpwd+${uid}@mailinator.com`;
  const password = `MobChg@${uid.toUpperCase()}1!`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const reg = new RegistrationPage(page);
    await reg.navigate();
    await reg.fillAllFields('Mobile', 'Throwaway', email, password);
    await reg.clickSubmit();
    await page.waitForTimeout(3000);
    if (!(await reg.isRegistrationSuccessful())) {
      this.logMessage(`[Throwaway] Web registration may not have completed for ${email}.`);
    }
  } finally {
    await browser.close();
  }

  this.throwawayEmail = email;
  this.throwawayPassword = password;
  this.logMessage(`[Throwaway] Registered ${email}; signing in on device.`);

  const signIn = new SignInScreen(this.driver);
  await signIn.signInAsCandidate(email, password);
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function sanitize(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').substring(0, 80);
}
