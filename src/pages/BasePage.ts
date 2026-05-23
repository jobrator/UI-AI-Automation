import { Page } from 'playwright';
import { CommonLibrary } from '../lib/CommonLibrary';
import { EnvConfig } from '../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * BasePage — abstract base for all Page Objects.
 *
 * Responsibilities:
 *  • Provides `this.page` (raw Playwright Page) for edge cases
 *  • Provides `this.lib` (CommonLibrary) for all standard interactions
 *  • Enforces the navigate() and isLoaded() contract on subclasses
 *
 * Page objects MUST NOT contain any test assertions (expect/assert) —
 * those belong in step definitions so that failures are traceable.
 * Page objects SHOULD throw descriptive errors when preconditions fail.
 */
export abstract class BasePage {
  protected readonly page: Page;
  protected readonly lib: CommonLibrary;
  protected readonly baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.lib = new CommonLibrary(page);
    this.baseUrl = envConfig.jobratorSite;
  }

  /**
   * Navigate directly to this page's canonical URL.
   * Implementations should call `this.lib.navigateTo(...)`.
   */
  abstract navigate(): Promise<void>;

  /**
   * Return true if the page has fully loaded and its primary content
   * is visible.  Used by hooks to verify navigation success.
   */
  abstract isLoaded(): Promise<boolean>;

  /**
   * Convenience — build a full URL from a relative path.
   * e.g.  this.url('/login')  →  'https://jobrator.com/login'
   */
  protected url(path: string): string {
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }

  /**
   * Wait for the page to finish loading.
   * Delegates to CommonLibrary.waitForNetworkIdle().
   */
  async waitForPageLoad(): Promise<void> {
    await this.lib.waitForNetworkIdle();
  }

  /** Return the current URL of the page. */
  getCurrentUrl(): string {
    return this.lib.getCurrentUrl();
  }

  /** Return the document title. */
  async getTitle(): Promise<string> {
    return this.lib.getPageTitle();
  }
}
