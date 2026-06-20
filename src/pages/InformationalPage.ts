import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { EnvConfig } from '../config/env.config';

const envConfig = EnvConfig.getInstance();

export type InformationalPageName = 'faq' | 'contact' | 'about' | 'resources';

/**
 * InformationalPage — Page Object for Jobrator's static informational pages:
 * FAQ, Contact, About, and Resources/Blog.
 *
 * All locators use resilient fallback selectors.
 * No assertions live here — they belong in step definitions.
 */
export class InformationalPage extends BasePage {

  // ── FAQ page ──────────────────────────────────────────────────────────────
  private readonly faqAccordionItem =
    '[class*="accordion"] [class*="item"], [class*="accordion"] [class*="question"], ' +
    '[class*="faq"] [class*="item"], [class*="faq-item"], details summary, ' +
    '[class*="collapse"] [class*="toggle"], .faq-question, [class*="faq-q"]';

  private readonly faqAccordionAnswer =
    '[class*="accordion"] [class*="content"], [class*="accordion"] [class*="body"], ' +
    '[class*="accordion"] [class*="answer"], [class*="faq"] [class*="answer"], ' +
    'details > p, [class*="collapse-body"], [class*="panel-body"], .faq-answer';

  // ── Contact page ──────────────────────────────────────────────────────────
  private readonly nameInput =
    'input[name="name"], input[name="full_name"], input[placeholder*="name" i], ' +
    'input[id*="name"], [class*="contact"] input[type="text"]:first-of-type';

  private readonly contactEmailInput =
    'input[name="email"], input[type="email"], input[placeholder*="email" i], ' +
    'input[id*="email"]';

  private readonly messageInput =
    'textarea[name="message"], textarea[name="msg"], textarea[placeholder*="message" i], ' +
    'textarea[id*="message"], textarea';

  private readonly sendMessageButton =
    'button:has-text("Send Message"), button:has-text("Send"), input[type="submit"]:has-text("Send"), ' +
    'button[type="submit"], [data-testid="send-message"]';

  private readonly successMessage =
    '[class*="success"], [role="alert"], .alert-success, .swal2-success, ' +
    '[class*="toast"], [class*="notify"], [class*="confirm"]';

  private readonly formValidationError =
    '[class*="error"], [class*="invalid"], .invalid-feedback, .field-error, ' +
    '[role="alert"], input:invalid, .has-error, ' +
    'span[class*="error"], p[class*="error"]';

  // ── Resources / Blog page ─────────────────────────────────────────────────
  private readonly featuredPostsSection =
    '[class*="featured"], [class*="post"], [class*="blog"], [class*="article"], ' +
    'section:has(article), section:has([class*="post"]), [class*="resource"]';

  private readonly blogPostTitle =
    '[class*="post"] h2, [class*="post"] h3, article h2, article h3, ' +
    '[class*="blog"] h2, [class*="blog"] h3, [class*="article"] h2, ' +
    '[class*="article"] h3, [class*="card"] h2, [class*="card"] h3, ' +
    'a[class*="title"], [class*="post-title"]';

  private readonly resourcesSearchInput =
    'input[type="search"], input[name*="search"], input[placeholder*="search" i], ' +
    '[class*="search"] input, input[type="text"][class*="search"]';

  private readonly articleContent =
    '[class*="article-content"], [class*="post-content"], [class*="blog-content"], ' +
    'main article, article [class*="content"], .single-post, [class*="single"] article, ' +
    'main > div > p, main p';

  // Internal state: remembers which FAQ item was clicked last
  private lastClickedFaqSelector = '';

  // ══════════════════════════════════════════════════════════════════════════
  //  Constructor / navigation
  // ══════════════════════════════════════════════════════════════════════════

  constructor(page: Page) {
    super(page);
  }

  private readonly pageRoutes: Record<InformationalPageName, string> = {
    faq:       '/faq',
    contact:   '/contact',
    about:     '/about',
    resources: '/blog'
  };

  /**
   * Navigate to the given page (defaults to 'faq').
   * Satisfies the BasePage abstract navigate() contract.
   */
  async navigate(pageName: InformationalPageName = 'faq'): Promise<void> {
    await this.lib.navigateTo(this.url(this.pageRoutes[pageName]));
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible('main, [class*="content"], [class*="page"], article, section');
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FAQ actions
  // ══════════════════════════════════════════════════════════════════════════

  async isAccordionSectionVisible(section: string): Promise<boolean> {
    const selector =
      `h2:has-text("${section}"), h3:has-text("${section}"), h4:has-text("${section}"), ` +
      `[class*="accordion"] :has-text("${section}"), [class*="faq"] :has-text("${section}"), ` +
      `button:has-text("${section}"), [class*="section-title"]:has-text("${section}")`;
    return this.lib.isVisible(selector);
  }

  async clickFirstFaqQuestion(): Promise<void> {
    const first = this.page.locator(this.faqAccordionItem).first();
    await first.waitFor({ state: 'visible', timeout: envConfig.defaultTimeout });
    this.lastClickedFaqSelector = this.faqAccordionItem;
    await first.click();
    await this.page.waitForTimeout(500);
  }

  async clickSameFaqQuestion(): Promise<void> {
    const selector = this.lastClickedFaqSelector || this.faqAccordionItem;
    await this.page.locator(selector).first().click();
    await this.page.waitForTimeout(500);
  }

  async isAccordionExpanded(): Promise<boolean> {
    return this.lib.isVisible(this.faqAccordionAnswer);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Contact form actions
  // ══════════════════════════════════════════════════════════════════════════

  async fillName(name: string): Promise<void> {
    await this.lib.clearAndFill(this.nameInput, name);
  }

  async fillEmail(email: string): Promise<void> {
    await this.lib.clearAndFill(this.contactEmailInput, email);
  }

  async fillMessage(message: string): Promise<void> {
    await this.lib.clearAndFill(this.messageInput, message);
  }

  async clickSendMessage(): Promise<void> {
    await this.lib.click(this.sendMessageButton);
    await this.page.waitForTimeout(2000);
  }

  async isSuccessMessageVisible(): Promise<boolean> {
    return this.lib.isVisible(this.successMessage);
  }

  async isFormValidationErrorVisible(): Promise<boolean> {
    return this.lib.isVisible(this.formValidationError);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  About page queries
  // ══════════════════════════════════════════════════════════════════════════

  async isAboutSectionVisible(sectionText: string): Promise<boolean> {
    const selector =
      `h1:has-text("${sectionText}"), h2:has-text("${sectionText}"), ` +
      `h3:has-text("${sectionText}"), h4:has-text("${sectionText}"), ` +
      `[class*="feature"]:has-text("${sectionText}"), ` +
      `[class*="card"]:has-text("${sectionText}"), ` +
      `section:has-text("${sectionText}")`;
    return this.lib.isVisible(selector);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Resources / Blog actions
  // ══════════════════════════════════════════════════════════════════════════

  async isFeaturedPostsSectionVisible(): Promise<boolean> {
    return this.lib.isVisible(this.featuredPostsSection);
  }

  async isBlogCategoryVisible(category: string): Promise<boolean> {
    const selector =
      `a:has-text("${category}"), [class*="category"]:has-text("${category}"), ` +
      `[class*="tag"]:has-text("${category}"), li:has-text("${category}"), ` +
      `span:has-text("${category}"), [class*="label"]:has-text("${category}")`;
    return this.lib.isVisible(selector);
  }

  async searchResources(keyword: string): Promise<void> {
    await this.lib.clearAndFill(this.resourcesSearchInput, keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isSearchResultsVisible(): Promise<boolean> {
    return this.lib.isVisible(this.blogPostTitle);
  }

  async clickFirstBlogPost(): Promise<void> {
    const first = this.page.locator(this.blogPostTitle).first();
    await first.waitFor({ state: 'visible', timeout: envConfig.defaultTimeout });
    await first.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isArticleContentVisible(): Promise<boolean> {
    return this.lib.isVisible(this.articleContent);
  }
}
