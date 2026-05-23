import { Browser, BrowserContext, Page } from 'playwright';

// ─── Browser / World ──────────────────────────────────────────────────────────

export type SupportedBrowser = 'chromium' | 'firefox' | 'webkit';

export interface WorldParameters {
  browser?: SupportedBrowser;
  headless?: boolean;
}

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

// ─── Test Data ────────────────────────────────────────────────────────────────

export interface UserCredentials {
  email: string;
  password: string;
  role?: 'candidate' | 'employer' | 'admin';
}

export interface TestUser extends UserCredentials {
  name?: string;
  isActive?: boolean;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
}

// ─── Screenshot / Report ─────────────────────────────────────────────────────

export interface ScreenshotOptions {
  path?: string;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
}

export interface ScenarioMetadata {
  name: string;
  tags: string[];
  browser: SupportedBrowser;
  startTime: Date;
  endTime?: Date;
  status?: 'passed' | 'failed' | 'skipped' | 'pending';
}

// ─── Agent Types ──────────────────────────────────────────────────────────────

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentConfig {
  model: string;
  maxTokens: number;
  siteUrl: string;
  credentials: UserCredentials;
}

export interface GeneratedScenario {
  title: string;
  tags: string[];
  steps: string[];
  category: 'smoke' | 'regression' | 'security' | 'boundary' | 'ui';
}

export interface GeneratedCode {
  stepDefinitions: string;
  pageObject: string;
  testData?: string;
}

// ─── Wait Conditions ──────────────────────────────────────────────────────────

export interface WaitOptions {
  timeout?: number;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface FormField {
  locator: string;
  value: string;
  type?: 'input' | 'select' | 'checkbox' | 'radio';
}
