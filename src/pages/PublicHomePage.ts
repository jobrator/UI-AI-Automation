import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { EnvConfig } from '../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * PublicHomePage — Page Object for the Jobrator public homepage.
 *
 * All locators use resilient fallback selectors to withstand CSS-class changes.
 * No assertions live here — they belong in step definitions.
 */
export class PublicHomePage extends BasePage {

  // ── Hero banner ───────────────────────────────────────────────────────────
  private readonly heroBannerHeading =
    'h1, h2, [class*="hero"] h1, [class*="hero"] h2, [class*="banner"] h1, ' +
    '[class*="banner"] h2, .hero-content h1, .hero-content h2, section:first-of-type h1';

  // ── Navigation links ──────────────────────────────────────────────────────
  private readonly mainNav =
    'nav, header nav, .main-nav, .navbar, [class*="header"] nav, [class*="nav-menu"], [role="navigation"]';

  private readonly loginRegisterNavLink =
    'nav a:has-text("Login"), nav a:has-text("Register"), nav a:has-text("Sign In"), ' +
    'nav a:has-text("Sign Up"), header a:has-text("Login"), header a:has-text("Register"), ' +
    'a[href*="login"], a[href*="register"], [class*="nav"] a:has-text("Login")';

  private readonly pricingNavLink =
    'nav a:has-text("Pricing"), header a:has-text("Pricing"), ' +
    'a[href*="subscription"], a[href*="pricing"], [class*="nav"] a:has-text("Pricing")';

  // ── How It Works section ──────────────────────────────────────────────────
  private readonly howItWorksSection =
    '[class*="how-it-work"], [class*="howitwork"], section:has(h2:has-text("How It Work")), ' +
    'section:has(h3:has-text("How It Work")), .how-it-works, [id*="how"]';

  // ── Footer links ──────────────────────────────────────────────────────────
  private readonly footer =
    'footer, [class*="footer"], [role="contentinfo"]';

  // ══════════════════════════════════════════════════════════════════════════
  //  Constructor / navigation
  // ══════════════════════════════════════════════════════════════════════════

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.lib.navigateTo(envConfig.jobratorSite);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.heroBannerHeading);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  /** Return the visible text of the hero banner heading */
  async getHeroBannerText(): Promise<string> {
    const locator = this.page.locator(this.heroBannerHeading).first();
    await locator.waitFor({ state: 'visible', timeout: envConfig.defaultTimeout });
    return (await locator.innerText()).trim();
  }

  /** Check whether a nav link with the given text label is visible */
  async isNavLinkVisible(text: string): Promise<boolean> {
    const selector =
      `nav a:has-text("${text}"), header a:has-text("${text}"), ` +
      `[class*="nav"] a:has-text("${text}"), [class*="menu"] a:has-text("${text}"), ` +
      `a[href]:has-text("${text}")`;
    return this.lib.isVisible(selector);
  }

  /** Check whether the login/register nav link is visible */
  async isLoginRegisterNavLinkVisible(): Promise<boolean> {
    return this.lib.isVisible(this.loginRegisterNavLink);
  }

  /** Click a nav link by its visible text label */
  async clickNavLink(text: string): Promise<void> {
    const selector =
      `nav a:has-text("${text}"), header a:has-text("${text}"), ` +
      `[class*="nav"] a:has-text("${text}"), [class*="menu"] a:has-text("${text}")`;
    await this.lib.click(selector);
  }

  /** Click the login / register CTA in the navigation */
  async clickLoginRegisterLink(): Promise<void> {
    await this.lib.click(this.loginRegisterNavLink);
  }

  /** Click the Pricing link in the navigation */
  async clickPricingLink(): Promise<void> {
    await this.lib.click(this.pricingNavLink);
  }

  /**
   * Click a tab in the "How It Works" section by its label text.
   * Tabs may be <button>, <a>, or <li> elements.
   */
  async clickHowItWorksTab(tab: string): Promise<void> {
    const selector =
      `[class*="how-it-work"] button:has-text("${tab}"), ` +
      `[class*="how-it-work"] a:has-text("${tab}"), ` +
      `[class*="how-it-work"] li:has-text("${tab}"), ` +
      `[class*="howitwork"] button:has-text("${tab}"), ` +
      `[class*="howitwork"] a:has-text("${tab}"), ` +
      `[class*="tab"]:has-text("${tab}"), ` +
      `button:has-text("${tab}"), li[class*="tab"]:has-text("${tab}")`;
    await this.lib.click(selector);
  }

  /**
   * Check whether the content panel for a given "How It Works" tab is displayed.
   * Looks for visible elements with text matching the tab label within panel/content containers.
   */
  async isHowItWorksContentVisible(tab: string): Promise<boolean> {
    const selector =
      `[class*="tab-content"]:has-text("${tab}"), ` +
      `[class*="tab-pane"].active:has-text("${tab}"), ` +
      `[class*="panel"]:has-text("${tab}"), ` +
      `[class*="how-it-work"] [class*="content"]:has-text("${tab}"), ` +
      `.active:has-text("${tab}"), [aria-selected="true"]:has-text("${tab}")`;
    return this.lib.isVisible(selector);
  }

  /** Check whether a footer link with the given text is visible */
  async isFooterLinkVisible(text: string): Promise<boolean> {
    const selector =
      `footer a:has-text("${text}"), [class*="footer"] a:has-text("${text}"), ` +
      `footer a[href*="${text.toLowerCase().replace(/\s+/g, '-')}"], ` +
      `[role="contentinfo"] a:has-text("${text}")`;
    return this.lib.isVisible(selector);
  }

  /** Return the current page URL */
  getCurrentPageUrl(): string {
    return this.page.url();
  }

  /**
   * Resize the viewport to simulate a mobile device width.
   */
  async setMobileViewport(width: number): Promise<void> {
    await this.page.setViewportSize({ width, height: 812 });
    await this.page.waitForTimeout(300);
  }

  /**
   * Returns true if the page body does not overflow horizontally.
   * Checks that scrollWidth <= clientWidth.
   */
  async hasNoHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(() => {
      return document.body.scrollWidth <= document.documentElement.clientWidth;
    });
  }

  /**
   * At mobile width the nav may be hidden behind a hamburger menu.
   * Returns true if either the full nav or a hamburger toggle is visible.
   */
  async isMobileNavAccessible(): Promise<boolean> {
    const hamburger = await this.lib.isVisible(
      '.hamburger, .menu-toggle, [class*="burger"], [class*="toggle"], ' +
      'button[aria-label*="menu" i], button[aria-label*="navigation" i], ' +
      '.navbar-toggler, [class*="mobile-menu"]'
    );
    const navVisible = await this.lib.isVisible(this.mainNav);
    return hamburger || navVisible;
  }
}
