import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface EnvConfiguration {
  // Site
  jobratorSite: string;

  // Credentials
  candidateEmail: string;
  candidatePassword: string;
  employerEmail: string;
  employerPassword: string;
  adminUrl: string;
  adminEmail: string;
  adminPassword: string;

  // Browser
  browser: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  slowMo: number;

  // Timeouts
  defaultTimeout: number;
  navigationTimeout: number;
  expectTimeout: number;

  // Retries
  maxRetries: number;
  retryDelay: number;

  // Reporting
  reportDir: string;
  screenshotOnFailure: boolean;
  videoOnFailure: boolean;
  traceOnFailure: boolean;

  // AI Agents
  anthropicApiKey: string;
  agentModel: string;
  agentMaxTokens: number;
}

/**
 * EnvConfig — Singleton that reads, validates, and exposes
 * all environment variables used throughout the framework.
 */
export class EnvConfig {
  private static instance: EnvConfig;
  private readonly _config: EnvConfiguration;

  private constructor() {
    this._config = {
      jobratorSite: this.requireEnv('JOBRATOR_SITE'),
      candidateEmail: this.requireEnv('CANDIDATE_EMAIL'),
      candidatePassword: this.requireEnv('CANDIDATE_PASSWORD'),
      employerEmail: process.env.EMPLOYER_EMAIL || '',
      employerPassword: process.env.EMPLOYER_PASSWORD || '',
      adminUrl: process.env.ADMIN_URL || 'https://jobrator.com/admin',
      adminEmail: process.env.ADMIN_EMAIL || '',
      adminPassword: process.env.ADMIN_PASSWORD || '',

      browser: (process.env.BROWSER as EnvConfiguration['browser']) || 'chromium',
      headless: process.env.HEADLESS !== 'false',
      slowMo: parseInt(process.env.SLOW_MO || '0', 10),

      defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000', 10),
      navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '60000', 10),
      expectTimeout: parseInt(process.env.EXPECT_TIMEOUT || '10000', 10),

      maxRetries: parseInt(process.env.MAX_RETRIES || '2', 10),
      retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10),

      reportDir: process.env.REPORT_DIR || 'reports',
      screenshotOnFailure: process.env.SCREENSHOT_ON_FAILURE !== 'false',
      videoOnFailure: process.env.VIDEO_ON_FAILURE !== 'false',
      traceOnFailure: process.env.TRACE_ON_FAILURE !== 'false',

      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      agentModel: process.env.AGENT_MODEL || 'claude-sonnet-4-20250514',
      agentMaxTokens: parseInt(process.env.AGENT_MAX_TOKENS || '8000', 10)
    };

    this.validate();
  }

  public static getInstance(): EnvConfig {
    if (!EnvConfig.instance) {
      EnvConfig.instance = new EnvConfig();
    }
    return EnvConfig.instance;
  }

  public get config(): EnvConfiguration {
    return this._config;
  }

  private requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(
        `[EnvConfig] Required environment variable "${key}" is not set. ` +
        `Copy .env.example to .env and fill in the values.`
      );
    }
    return value;
  }

  private validate(): void {
    const validBrowsers: EnvConfiguration['browser'][] = ['chromium', 'firefox', 'webkit'];
    if (!validBrowsers.includes(this._config.browser)) {
      throw new Error(
        `[EnvConfig] Invalid BROWSER value "${this._config.browser}". ` +
        `Valid options: ${validBrowsers.join(', ')}`
      );
    }

    if (!this._config.jobratorSite.startsWith('http')) {
      throw new Error(`[EnvConfig] JOBRATOR_SITE must be a valid URL starting with http/https.`);
    }

    // Ensure report directories exist
    const dirs = [
      this._config.reportDir,
      `${this._config.reportDir}/screenshots`,
      `${this._config.reportDir}/videos`,
      `${this._config.reportDir}/traces`
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /** Convenience accessor — no need to call .config.xxx every time */
  public get jobratorSite(): string { return this._config.jobratorSite; }
  public get candidateEmail(): string { return this._config.candidateEmail; }
  public get candidatePassword(): string { return this._config.candidatePassword; }
  public get employerEmail(): string { return this._config.employerEmail; }
  public get employerPassword(): string { return this._config.employerPassword; }
  public get adminUrl(): string { return this._config.adminUrl; }
  public get adminEmail(): string { return this._config.adminEmail; }
  public get adminPassword(): string { return this._config.adminPassword; }
  public get browser(): EnvConfiguration['browser'] { return this._config.browser; }
  public get headless(): boolean { return this._config.headless; }
  public get slowMo(): number { return this._config.slowMo; }
  public get defaultTimeout(): number { return this._config.defaultTimeout; }
  public get navigationTimeout(): number { return this._config.navigationTimeout; }
  public get expectTimeout(): number { return this._config.expectTimeout; }
  public get maxRetries(): number { return this._config.maxRetries; }
  public get reportDir(): string { return this._config.reportDir; }
  public get screenshotOnFailure(): boolean { return this._config.screenshotOnFailure; }
  public get videoOnFailure(): boolean { return this._config.videoOnFailure; }
  public get traceOnFailure(): boolean { return this._config.traceOnFailure; }
  public get anthropicApiKey(): string { return this._config.anthropicApiKey; }
  public get agentModel(): string { return this._config.agentModel; }
  public get agentMaxTokens(): number { return this._config.agentMaxTokens; }
}
