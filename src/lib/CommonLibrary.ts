import { Page, Locator } from 'playwright';
import { expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { EnvConfig } from '../config/env.config';
import { WaitOptions, ScreenshotOptions } from '../types';

const envConfig = EnvConfig.getInstance();

/**
 * CommonLibrary — centralised Playwright helper methods.
 *
 * Every Page Object inherits from BasePage which exposes an instance of this
 * class via `this.lib`. Direct use from step definitions is also supported
 * by instantiating with the current `page`.
 *
 * Design principles:
 *  • All methods accept a CSS / XPath / text selector OR a Playwright Locator
 *  • Meaningful error messages include the selector for fast debugging
 *  • Retries and waits are built in using Playwright's auto-waiting
 */
export class CommonLibrary {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Navigation
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Navigate to a URL.  Relative paths are prepended with the base site URL.
   */
  async navigateTo(url: string, waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded'): Promise<void> {
    const target = url.startsWith('http') ? url : `${envConfig.jobratorSite}${url}`;
    console.log(`[Lib] navigateTo → ${target}`);
    try {
      await this.page.goto(target, { waitUntil, timeout: envConfig.navigationTimeout });
    } catch (err) {
      const msg = String(err);
      if (msg.includes('net::ERR_') || msg.includes('ERR_INTERNET_DISCONNECTED')) {
        console.warn(`[Lib] Navigation error (${msg.split('\n')[0].substring(0, 60)}) — retrying after 2s`);
        await this.page.waitForTimeout(2000);
        await this.page.goto(target, { waitUntil, timeout: envConfig.navigationTimeout });
      } else {
        throw err;
      }
    }
  }

  /** Reload current page */
  async reloadPage(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  /** Go back one step in browser history */
  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
  }

  /** Return the current page URL */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /** Return the page title */
  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Element resolution
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Resolve a selector string or existing Locator into a Locator.
   * Supports CSS, XPath, text=, role= and any other Playwright selector engine.
   */
  resolve(selector: string | Locator): Locator {
    return typeof selector === 'string' ? this.page.locator(selector) : selector;
  }

  /**
   * Resolve a selector to its first *visible* match.
   *
   * Responsive Jobrator pages frequently render a hidden mobile copy of a
   * control alongside the visible desktop copy (same name/placeholder). A plain
   * `.first()` resolves to the hidden copy, so an ensuing `waitFor({visible})`
   * times out. Filtering to visible elements first picks the copy the user
   * actually interacts with. For a selector whose first match is already visible
   * this is a no-op, so it never changes behaviour for controls that work today.
   */
  resolveVisible(selector: string | Locator): Locator {
    if (typeof selector !== 'string') return selector.first();
    return this.page.locator(selector).filter({ visible: true }).first();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Interactions
  // ══════════════════════════════════════════════════════════════════════════

  /** Click an element, waiting for it to be visible and enabled first */
  async click(selector: string | Locator, options?: { force?: boolean; timeout?: number }): Promise<void> {
    const locator = this.resolveVisible(selector);
    console.log(`[Lib] click → ${selector}`);
    await locator.waitFor({ state: 'visible', timeout: options?.timeout ?? envConfig.defaultTimeout });
    await locator.click({ force: options?.force });
  }

  /** Double-click an element */
  async doubleClick(selector: string | Locator): Promise<void> {
    await this.resolve(selector).dblclick();
  }

  /** Right-click (context menu) an element */
  async rightClick(selector: string | Locator): Promise<void> {
    await this.resolve(selector).click({ button: 'right' });
  }

  /**
   * Type into an input field.
   * The field is cleared first unless `append` is true.
   */
  async fill(selector: string | Locator, value: string, append = false): Promise<void> {
    const locator = this.resolveVisible(selector);
    await locator.waitFor({ state: 'visible', timeout: envConfig.defaultTimeout });
    if (!append) await locator.clear();
    await locator.fill(value);
  }

  /** Alias: clear the field then type (explicit intent for readability) */
  async clearAndFill(selector: string | Locator, value: string): Promise<void> {
    await this.fill(selector, value, false);
  }

  /** Type character-by-character (useful for auto-complete / typeahead) */
  async typeSlowly(selector: string | Locator, value: string, delayMs = 80): Promise<void> {
    const locator = this.resolveVisible(selector);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
    await locator.clear();
    await locator.pressSequentially(value, { delay: delayMs });
  }

  /** Press a keyboard key on a focused element */
  async pressKey(selector: string | Locator, key: string): Promise<void> {
    await this.resolve(selector).press(key);
  }

  /** Press a keyboard key globally (not bound to an element) */
  async pressGlobalKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /** Hover over an element */
  async hover(selector: string | Locator): Promise<void> {
    await this.resolve(selector).hover();
  }

  /** Select a dropdown option by visible label */
  async selectOption(selector: string | Locator, label: string): Promise<void> {
    await this.resolveVisible(selector).selectOption({ label });
  }

  /** Select a dropdown option by value attribute */
  async selectOptionByValue(selector: string | Locator, value: string): Promise<void> {
    await this.resolveVisible(selector).selectOption({ value });
  }

  /** Check a checkbox (idempotent — does nothing if already checked) */
  async checkCheckbox(selector: string | Locator): Promise<void> {
    await this.resolve(selector).check();
  }

  /** Uncheck a checkbox (idempotent) */
  async uncheckCheckbox(selector: string | Locator): Promise<void> {
    await this.resolve(selector).uncheck();
  }

  /** Scroll element into the viewport */
  async scrollToElement(selector: string | Locator): Promise<void> {
    await this.resolve(selector).scrollIntoViewIfNeeded();
  }

  /** Scroll to top or bottom of page */
  async scrollPage(direction: 'top' | 'bottom'): Promise<void> {
    await this.page.evaluate((dir) => {
      window.scrollTo({ top: dir === 'bottom' ? document.body.scrollHeight : 0, behavior: 'smooth' });
    }, direction);
  }

  /** Upload a file to a file input element */
  async uploadFile(selector: string | Locator, filePath: string): Promise<void> {
    await this.resolve(selector).setInputFiles(filePath);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Reading element properties
  // ══════════════════════════════════════════════════════════════════════════

  /** Get the visible inner text of an element */
  async getText(selector: string | Locator): Promise<string> {
    // Use the first visible match to avoid strict-mode violations when a broad
    // selector matches several elements (e.g. multiple error containers).
    return (await this.resolveVisible(selector).innerText()).trim();
  }

  /** Get the value attribute of an input element */
  async getInputValue(selector: string | Locator): Promise<string> {
    return this.resolveVisible(selector).inputValue();
  }

  /** Get any HTML attribute of an element */
  async getAttribute(selector: string | Locator, attribute: string): Promise<string | null> {
    return this.resolve(selector).getAttribute(attribute);
  }

  /** Get the count of elements matching a selector */
  async getCount(selector: string): Promise<number> {
    return this.page.locator(selector).count();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Visibility / State checks
  // ══════════════════════════════════════════════════════════════════════════

  /** Returns true if a visible match for the selector exists in the DOM */
  async isVisible(selector: string | Locator): Promise<boolean> {
    // Prefer a visible match over a (possibly hidden) first DOM match, so that a
    // hidden responsive duplicate preceding the real control does not mask it.
    return this.resolveVisible(selector).isVisible();
  }

  /** Returns true if the element is hidden or not in the DOM */
  async isHidden(selector: string | Locator): Promise<boolean> {
    return this.resolve(selector).isHidden();
  }

  /** Returns true if the element is enabled (not disabled) */
  async isEnabled(selector: string | Locator): Promise<boolean> {
    return this.resolve(selector).isEnabled();
  }

  /** Returns true if a checkbox/radio is checked */
  async isChecked(selector: string | Locator): Promise<boolean> {
    return this.resolve(selector).isChecked();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Waits
  // ══════════════════════════════════════════════════════════════════════════

  /** Wait until an element reaches a given state */
  async waitForElement(selector: string | Locator, opts: WaitOptions = {}): Promise<void> {
    await this.resolve(selector).waitFor({
      state: opts.state ?? 'visible',
      timeout: opts.timeout ?? envConfig.defaultTimeout
    });
  }

  /** Wait until the page URL matches the given string or regex */
  async waitForUrl(urlOrRegex: string | RegExp, timeout?: number): Promise<void> {
    await this.page.waitForURL(urlOrRegex, { timeout: timeout ?? envConfig.navigationTimeout });
  }

  /** Wait for all network requests to settle */
  async waitForNetworkIdle(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: timeout ?? envConfig.navigationTimeout });
  }

  /** Wait for a specific number of milliseconds */
  async waitMs(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Assertions (wrapped expect)
  // ══════════════════════════════════════════════════════════════════════════

  async assertVisible(selector: string | Locator, message?: string): Promise<void> {
    await expect(this.resolve(selector), message).toBeVisible({ timeout: envConfig.expectTimeout });
  }

  async assertHidden(selector: string | Locator, message?: string): Promise<void> {
    await expect(this.resolve(selector), message).toBeHidden({ timeout: envConfig.expectTimeout });
  }

  async assertText(selector: string | Locator, expectedText: string, exact = false): Promise<void> {
    if (exact) {
      await expect(this.resolve(selector)).toHaveText(expectedText, { timeout: envConfig.expectTimeout });
    } else {
      await expect(this.resolve(selector)).toContainText(expectedText, { timeout: envConfig.expectTimeout });
    }
  }

  async assertUrl(urlOrRegex: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(urlOrRegex, { timeout: envConfig.expectTimeout });
  }

  async assertTitle(titleOrRegex: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(titleOrRegex, { timeout: envConfig.expectTimeout });
  }

  async assertInputValue(selector: string | Locator, expectedValue: string): Promise<void> {
    await expect(this.resolve(selector)).toHaveValue(expectedValue, { timeout: envConfig.expectTimeout });
  }

  async assertEnabled(selector: string | Locator): Promise<void> {
    await expect(this.resolve(selector)).toBeEnabled({ timeout: envConfig.expectTimeout });
  }

  async assertDisabled(selector: string | Locator): Promise<void> {
    await expect(this.resolve(selector)).toBeDisabled({ timeout: envConfig.expectTimeout });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Screenshots & Tracing
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Take a screenshot and save it to the reports directory.
   * Returns the raw Buffer so callers can also attach it to Cucumber.
   */
  async takeScreenshot(name: string, opts: ScreenshotOptions = {}): Promise<Buffer> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${name}_${timestamp}.png`;
    const filePath = path.join(envConfig.reportDir, 'screenshots', fileName);

    const screenshot = await this.page.screenshot({
      path: filePath,
      fullPage: opts.fullPage ?? true,
      clip: opts.clip
    });

    console.log(`[Lib] Screenshot saved → ${filePath}`);
    return screenshot;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Dialog handling
  // ══════════════════════════════════════════════════════════════════════════

  /** Accept the next browser dialog (alert/confirm/prompt) */
  async acceptDialog(promptText?: string): Promise<void> {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept(promptText);
    });
  }

  /** Dismiss the next browser dialog */
  async dismissDialog(): Promise<void> {
    this.page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  iFrame helpers
  // ══════════════════════════════════════════════════════════════════════════

  /** Get a FrameLocator for an iframe, then locate an element inside it */
  getFrameLocator(iframeSelector: string, elementSelector: string): Locator {
    return this.page.frameLocator(iframeSelector).locator(elementSelector);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Security helpers
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Check that the current URL starts with https://.
   * Used in OWASP security scenarios.
   */
  assertHttps(): void {
    const url = this.getCurrentUrl();
    if (!url.startsWith('https://')) {
      throw new Error(`[Security] Page is NOT served over HTTPS. URL: ${url}`);
    }
    console.log(`[Security] HTTPS verified: ${url}`);
  }

  /**
   * Assert that the URL does not contain any of the provided sensitive patterns
   * (e.g., password, token, credentials in query string).
   */
  assertNoSensitiveDataInUrl(patterns: string[] = ['password', 'passwd', 'token', 'secret', 'key']): void {
    const url = this.getCurrentUrl().toLowerCase();
    for (const pattern of patterns) {
      if (url.includes(pattern)) {
        throw new Error(`[Security] URL contains sensitive pattern "${pattern}": ${url}`);
      }
    }
    console.log('[Security] No sensitive data found in URL.');
  }

  /**
   * Verify that an input of type="password" has the correct type attribute
   * (i.e., its value is masked by the browser).
   */
  async assertPasswordMasked(selector: string | Locator): Promise<void> {
    const type = await this.getAttribute(selector, 'type');
    if (type !== 'password') {
      throw new Error(
        `[Security] Expected input type="password" but got type="${type}". ` +
        `Password field is NOT masking user input.`
      );
    }
    console.log('[Security] Password field is masked (type="password").');
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Cookie & Storage helpers
  // ══════════════════════════════════════════════════════════════════════════

  /** Return all cookies in the current browser context */
  async getCookies(): Promise<Array<{ name: string; value: string; domain: string }>> {
    return this.page.context().cookies();
  }

  /** Clear all cookies */
  async clearCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }

  /** Get a value from localStorage */
  async getLocalStorageItem(key: string): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /** Clear all localStorage */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Performance helpers
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Measure how long a navigation takes in ms.
   * Used in UI performance scenarios.
   */
  async measureLoadTime(url?: string): Promise<number> {
    const start = Date.now();
    if (url) {
      await this.navigateTo(url);
    } else {
      await this.reloadPage();
    }
    await this.waitForNetworkIdle();
    return Date.now() - start;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Table helpers
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Read an HTML table into a 2-D array of strings.
   * `tableSelector` should match a <table> element.
   */
  async readTable(tableSelector: string): Promise<string[][]> {
    return this.page.evaluate((sel) => {
      const rows = Array.from(document.querySelector(sel)?.querySelectorAll('tr') ?? []);
      return rows.map((row) =>
        Array.from(row.querySelectorAll('td, th')).map((cell) => (cell as HTMLElement).innerText.trim())
      );
    }, tableSelector);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Utility
  // ══════════════════════════════════════════════════════════════════════════

  /** Generate a random string (useful for unique test data) */
  randomString(length = 8): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  /** Generate a random email address */
  randomEmail(domain = 'test.example.com'): string {
    return `testuser_${this.randomString(6)}@${domain}`;
  }

  /** Pause execution — use sparingly; prefer explicit waits */
  async pause(ms: number): Promise<void> {
    await this.waitMs(ms);
  }
}
