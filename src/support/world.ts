import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from 'playwright';
import { SupportedBrowser, WorldParameters, ScenarioMetadata } from '../types';
import { EnvConfig } from '../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * CustomWorld — extends Cucumber's World to carry Playwright browser state
 * and scenario metadata throughout the test lifecycle.
 *
 * Instantiated fresh per scenario (Cucumber default behaviour).
 */
export class CustomWorld extends World {
  // ── Playwright handles ───────────────────────────────────────────────────
  public browser!: Browser;
  public context!: BrowserContext;
  public page!: Page;

  // ── Scenario metadata ────────────────────────────────────────────────────
  public scenarioMeta!: ScenarioMetadata;

  // ── Cross-step state storage ─────────────────────────────────────────────
  public linkedInPage?: Page;
  public downloadedFilename?: string;
  // Credentials for a freshly-registered candidate (used in subscription scenarios)
  public freshCandidateEmail?: string;
  public freshCandidatePassword?: string;
  // A per-scenario registered account for negative login scenarios, so bad passwords
  // never hit the shared .env accounts (see support/throwaway-accounts.ts)
  public isolatedLoginAccount?: { email: string; password: string };
  // Raw login API responses, keyed by what was sent (login_bug_regressions.steps.ts)
  public loginApiResponses: Record<string, { status: number; body: string }[]> = {};

  // ── Derived from cucumber worldParameters ────────────────────────────────
  public browserType: SupportedBrowser;

  constructor(options: IWorldOptions) {
    super(options);

    const params = (options.parameters || {}) as WorldParameters;

    // Priority order: worldParameters → BROWSER env var → default
    this.browserType =
      params.browser ||
      (process.env.BROWSER as SupportedBrowser) ||
      envConfig.browser ||
      'chromium';
  }

  /**
   * Attach a screenshot to the Cucumber report.
   * Automatically called by the After hook on failure.
   */
  public async attachScreenshot(label = 'screenshot'): Promise<void> {
    try {
      const screenshot = await this.page.screenshot({ fullPage: false });
      await this.attach(screenshot, 'image/png');
      console.log(`[World] Screenshot attached: ${label}`);
    } catch (err) {
      console.warn(`[World] Could not take screenshot: ${(err as Error).message}`);
    }
  }

  /**
   * Attach arbitrary text to the Cucumber report (e.g. console logs, API responses).
   */
  public async attachText(text: string, mediaType = 'text/plain'): Promise<void> {
    await this.attach(text, mediaType);
  }

  /**
   * Log a message to the terminal with a [World] prefix.
   * Renamed from `log` to avoid colliding with Cucumber's built-in World.log.
   */
  public logMessage(message: string): void {
    console.log(`[World][${this.browserType.toUpperCase()}] ${message}`);
  }
}

// Register our custom world so Cucumber uses it for every scenario
setWorldConstructor(CustomWorld);
