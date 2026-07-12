import {
  Before,
  After,
  BeforeAll,
  AfterAll,
  BeforeStep,
  AfterStep,
  Status,
  setDefaultTimeout
} from '@cucumber/cucumber';
import {
  chromium,
  firefox,
  webkit,
  Browser
} from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { CustomWorld } from '../support/world';
import { EnvConfig } from '../config/env.config';
import { SupportedBrowser } from '../types';

// ─── Global setup ─────────────────────────────────────────────────────────────

const envConfig = EnvConfig.getInstance();

// Set the global Cucumber step timeout
setDefaultTimeout(Math.max(envConfig.defaultTimeout, envConfig.navigationTimeout));

// ─── BeforeAll ────────────────────────────────────────────────────────────────

BeforeAll(async function () {
  console.log('\n════════════════════════════════════════════════════');
  console.log('  Jobrator E2E Framework — Test Run Starting');
  console.log(`  Target: ${envConfig.jobratorSite}`);
  console.log('════════════════════════════════════════════════════\n');

  // Ensure report directories exist
  const dirs = [
    path.join(envConfig.reportDir, 'screenshots'),
    path.join(envConfig.reportDir, 'videos'),
    path.join(envConfig.reportDir, 'traces')
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─── AfterAll ─────────────────────────────────────────────────────────────────

AfterAll(async function () {
  console.log('\n════════════════════════════════════════════════════');
  console.log('  Test Run Complete');
  console.log('════════════════════════════════════════════════════\n');
});

// ─── Before (per scenario) ────────────────────────────────────────────────────

Before(async function (this: CustomWorld, scenario) {
  const scenarioName = scenario.pickle.name;
  const tags = scenario.pickle.tags.map((t) => t.name);
  const browserType: SupportedBrowser = this.browserType;

  this.scenarioMeta = {
    name: scenarioName,
    tags,
    browser: browserType,
    startTime: new Date()
  };

  this.logMessage(`Starting scenario: "${scenarioName}" [${tags.join(', ')}]`);

  // ── Launch browser ────────────────────────────────────────────────────────
  const launchOptions = {
    headless: envConfig.headless,
    slowMo: envConfig.slowMo,
    args: browserType === 'chromium'
      ? ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox']
      : []
  };

  if (browserType === 'firefox') {
    this.browser = await firefox.launch(launchOptions);
  } else if (browserType === 'webkit') {
    this.browser = await webkit.launch({ headless: envConfig.headless, slowMo: envConfig.slowMo });
  } else {
    this.browser = await chromium.launch(launchOptions);
  }

  // ── Create browser context ────────────────────────────────────────────────
  const contextOptions: Parameters<Browser['newContext']>[0] = {
    viewport: { width: 1280, height: 720 },
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    // Record video on failure (file is saved in After hook)
    recordVideo: envConfig.videoOnFailure
      ? { dir: path.join(envConfig.reportDir, 'videos') }
      : undefined
  };

  this.context = await this.browser.newContext(contextOptions);

  // ── Start tracing if configured ───────────────────────────────────────────
  if (envConfig.traceOnFailure) {
    await this.context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true
    });
  }

  // ── Open the page ─────────────────────────────────────────────────────────
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(envConfig.defaultTimeout);
  this.page.setDefaultNavigationTimeout(envConfig.navigationTimeout);

  // ── Console error capture for debugging ──────────────────────────────────
  this.page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.warn(`[Browser Console ERROR] ${msg.text()}`);
    }
  });

  this.page.on('pageerror', (err) => {
    console.error(`[Browser Page ERROR] ${err.message}`);
  });
});

// ─── After (per scenario) ────────────────────────────────────────────────────

After(async function (this: CustomWorld, scenario) {
  const status = scenario.result?.status;
  const scenarioName = this.scenarioMeta?.name ?? 'unknown';
  const isFailed = status === Status.FAILED;

  this.scenarioMeta.endTime = new Date();
  this.scenarioMeta.status = isFailed ? 'failed' : status === Status.SKIPPED ? 'skipped' : 'passed';

  // ── Screenshot on failure ─────────────────────────────────────────────────
  if (isFailed && envConfig.screenshotOnFailure && this.page) {
    try {
      await this.attachScreenshot(`FAILED_${scenarioName}`);
      this.logMessage(`Screenshot captured for failed scenario.`);
    } catch (e) {
      console.warn(`[Hooks] Could not capture screenshot: ${(e as Error).message}`);
    }
  }

  // ── Save trace on failure ─────────────────────────────────────────────────
  if (envConfig.traceOnFailure && this.context) {
    const tracePath = path.join(
      envConfig.reportDir,
      'traces',
      `${sanitizeFileName(scenarioName)}_${this.browserType}.zip`
    );
    try {
      await this.context.tracing.stop({ path: isFailed ? tracePath : undefined });
      if (isFailed) {
        this.logMessage(`Trace saved → ${tracePath}`);
        const traceContent = fs.readFileSync(tracePath);
        this.attach(traceContent, 'application/zip');
      }
    } catch (e) {
      console.warn(`[Hooks] Could not save trace: ${(e as Error).message}`);
    }
  }

  // ── Attach browser logs on failure ────────────────────────────────────────
  if (isFailed) {
    await this.attachText(
      `Browser: ${this.browserType}\nURL: ${this.page?.url() ?? 'N/A'}\nStatus: ${status}`,
      'text/plain'
    );
  }

  // ── Close page (finalises the video file on disk) ────────────────────────
  // Grab the video reference BEFORE closing — it becomes unavailable after.
  const video = envConfig.videoOnFailure ? (this.page?.video() ?? null) : null;

  try {
    if (this.page && !this.page.isClosed()) await this.page.close();
  } catch (e) {
    console.warn(`[Hooks] Page close error: ${(e as Error).message}`);
  }

  // ── Delete video for passing tests ───────────────────────────────────────
  // Video is only useful on failure; delete it immediately for passing tests
  // to avoid filling the reports/videos directory with unnecessary files.
  if (video) {
    try {
      const videoFilePath = await video.path();
      if (videoFilePath && fs.existsSync(videoFilePath)) {
        if (!isFailed) {
          fs.unlinkSync(videoFilePath);
          this.logMessage(`Video deleted (test passed — not needed): ${path.basename(videoFilePath)}`);
        }
      }
    } catch (e) {
      console.warn(`[Hooks] Could not handle video file: ${(e as Error).message}`);
    }
  }

  // ── Close context / browser ───────────────────────────────────────────────
  try {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  } catch (e) {
    console.warn(`[Hooks] Cleanup error: ${(e as Error).message}`);
  }

  const duration = this.scenarioMeta?.endTime && this.scenarioMeta?.startTime
    ? `${(this.scenarioMeta.endTime.getTime() - this.scenarioMeta.startTime.getTime())}ms`
    : 'N/A';

  this.logMessage(`Scenario "${scenarioName}" → ${status?.toUpperCase()} (${duration})`);
});

// ─── BeforeStep ───────────────────────────────────────────────────────────────

BeforeStep(async function (this: CustomWorld, step) {
  // Optional: log each step for debugging
  if (process.env.VERBOSE === 'true') {
    this.logMessage(`Step: ${step.pickleStep.text}`);
  }
});

// ─── AfterStep ────────────────────────────────────────────────────────────────

AfterStep(async function (this: CustomWorld, step) {
  const status = step.result?.status;
  if (status === Status.FAILED) {
    console.error(`[Hooks] Step FAILED: "${step.pickleStep.text}"`);
  }
});

// ─── Tagged hooks ─────────────────────────────────────────────────────────────

/** For @security scenarios: disable JavaScript to test XSS resilience */
Before({ tags: '@block-scripts' }, async function (this: CustomWorld) {
  await this.context.route('**/*.js', (route) => route.abort());
  this.logMessage('JavaScript blocked for @block-scripts scenario.');
});

/** For employer scenarios that need to start already logged in */
Before({ tags: '@requires-employer-login' }, async function (this: CustomWorld) {
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();
  const { EmployerLoginPage } = await import('../pages/EmployerLoginPage');

  const loginPage = new EmployerLoginPage(this.page);
  await loginPage.navigate();
  await loginPage.login(env.employerEmail, env.employerPassword);

  await this.page.waitForURL(/dashboard|home|employer|recruiter|jobs/, {
    timeout: envConfig.navigationTimeout
  });

  this.logMessage('Pre-condition: employer is now logged in (@requires-employer-login).');
});

/** For candidate scenarios that need to start already logged in */
Before({ tags: '@requires-login' }, async function (this: CustomWorld) {
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();
  const { LoginPage } = await import('../pages/LoginPage');

  const loginPage = new LoginPage(this.page);
  await loginPage.navigate();
  await loginPage.login(env.candidateEmail, env.candidatePassword);

  // Wait for post-login state
  await this.page.waitForURL(/dashboard|home|profile|jobs|application/, {
    timeout: envConfig.navigationTimeout
  });

  this.logMessage('Pre-condition: user is now logged in (@requires-login).');
});

/** For candidate portal scenarios (alias for @requires-login with the @requires-candidate-login tag) */
Before({ tags: '@requires-candidate-login' }, async function (this: CustomWorld) {
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();
  const { LoginPage } = await import('../pages/LoginPage');

  const loginPage = new LoginPage(this.page);
  await loginPage.navigate();
  await loginPage.login(env.candidateEmail, env.candidatePassword);

  // Wait for post-login state
  await this.page.waitForURL(/dashboard|home|profile|jobs|application/, {
    timeout: envConfig.navigationTimeout
  });

  this.logMessage('Pre-condition: candidate is now logged in (@requires-candidate-login).');
});

/**
 * For scenarios that would permanently alter account credentials (e.g. TC_CHG002).
 * Registers a brand-new throwaway account on mailinator.com, logs in as that
 * account, and stores the credentials on world.freshCandidateEmail /
 * world.freshCandidatePassword. The shared candidate+tosin@gmail.com account
 * is never touched.
 */
Before({ tags: '@requires-throwaway-candidate' }, async function (this: CustomWorld) {
  const { RegistrationPage } = await import('../pages/RegistrationPage');
  const { LoginPage } = await import('../pages/LoginPage');

  const uid = Date.now().toString(36);
  const throwawayEmail    = `testchgpwd+${uid}@mailinator.com`;
  const throwawayPassword = `TestChg@${uid.toUpperCase()}1!`;

  // Register
  const regPage = new RegistrationPage(this.page);
  await regPage.navigate();
  await regPage.fillAllFields('Test', 'Throwaway', throwawayEmail, throwawayPassword);
  await regPage.clickSubmit();
  await this.page.waitForTimeout(3000);

  const regOk = await regPage.isRegistrationSuccessful();
  if (!regOk) {
    this.logMessage(`[Throwaway] Registration may not have completed. URL: ${this.page.url()}`);
  }

  // If redirected to a verify page, skip — we just need to be logged in
  const currentUrl = this.page.url();
  if (!/dashboard/i.test(currentUrl)) {
    // Try logging in directly
    const loginPage = new LoginPage(this.page);
    await loginPage.navigate();
    await loginPage.login(throwawayEmail, throwawayPassword);
    await this.page.waitForTimeout(2000);
  }

  this.freshCandidateEmail    = throwawayEmail;
  this.freshCandidatePassword = throwawayPassword;

  this.logMessage(`[Throwaway] Registered & logged in as: ${throwawayEmail}`);
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').substring(0, 80);
}
