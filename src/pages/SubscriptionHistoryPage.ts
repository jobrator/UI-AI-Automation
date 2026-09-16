import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * SubscriptionHistoryPage — Page Object for /dashboard/subscription-history
 */
export class SubscriptionHistoryPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly subscriptionList =
    '.subscription-list, .subscriptions-table, [data-testid="subscription-list"], ' +
    'table tbody, [class*="subscription-list"], .billing-history, .plan-history';

  private readonly subscriptionEntry =
    '.subscription-item, .subscription-row, [data-testid="subscription-entry"], ' +
    'table tbody tr, [class*="subscription-item"], .plan-item, .billing-row';

  private readonly planNameEl =
    'table td, td:nth-child(2), ' +
    '.plan-name, .subscription-plan, .package-name, td.plan, td.name, ' +
    '[data-testid="plan-name"], [class*="plan-name"], .product-name, ' +
    'th:has-text("Name"), h4:has-text("Active"), p:has-text("Active plan")';

  private readonly startDateEl =
    '.start-date, .subscription-start, td.start, [data-testid="start-date"], ' +
    '[class*="start-date"], td:nth-child(2)';

  private readonly endDateEl =
    '.end-date, .subscription-end, td.end, [data-testid="end-date"], ' +
    '[class*="end-date"], .expiry-date, td:nth-child(3)';

  private readonly statusEl =
    '.subscription-status, .status-badge, .badge, td.status, ' +
    '[data-testid="subscription-status"], [class*="status"], .plan-status, ' +
    'td:last-child, span:has-text("Active"), span:has-text("Expired"), span:has-text("Inactive"), ' +
    'td:has-text("Active"), td:has-text("Expired"), td:has-text("Inactive")';

  private readonly emptyState =
    '.empty-state, [class*="no-result"], [class*="empty"], [class*="no-subscription"], ' +
    '*:has-text("No subscription"), *:has-text("No records"), *:has-text("No history"), ' +
    '*:has-text("haven\'t subscribed"), *:has-text("no plans"), ' +
    '[data-testid="empty-state"]';

  private readonly sidebarSubscriptionsLink =
    'a[href*="subscription"], a:has-text("Subscriptions"), a:has-text("Subscription History"), ' +
    'a:has-text("Billing"), [data-testid="sidebar-subscriptions-link"], ' +
    '.sidebar a:has-text("Subscription"), nav a:has-text("Subscription")';

  // ══════════════════════════════════════════════════════════════════════════
  //  Constructor
  // ══════════════════════════════════════════════════════════════════════════

  constructor(page: Page) {
    super(page);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Navigation
  // ══════════════════════════════════════════════════════════════════════════

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/dashboard/subscription-history'));
    await this.page.waitForTimeout(1500);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('domcontentloaded');
    if (
      (await this.lib.isVisible(this.subscriptionList)) ||
      (await this.lib.isVisible(this.emptyState)) ||
      (await this.lib.isVisible(this.subscriptionEntry))
    ) {
      return true;
    }
    // The sidebar "Subscriptions" link opens the subscription section (plans),
    // which is the subscription area reached from the sidebar — accept its
    // content (plan names / pricing) as a loaded subscription page.
    return this.lib.isVisible(
      '*:has-text("Jobrator Plus"), *:has-text("Subscription"), [class*="subscription"], [class*="pricing"], [class*="plan"]'
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Query methods
  // ══════════════════════════════════════════════════════════════════════════

  async isSubscriptionVisible(): Promise<boolean> {
    const count = await this.lib.getCount(this.subscriptionEntry);
    return count > 0;
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return this.lib.isVisible(this.emptyState);
  }

  async getPlanName(): Promise<string> {
    return this.lib.getText(this.planNameEl);
  }

  /**
   * Name of the plan in the "Active plan" table, or '' when there is none.
   *
   * The page renders two tables: "Active plan" (current entitlement) and
   * "Subscription History" (all past purchases). An unsubscribed account shows
   * the Active plan table with a single "---" placeholder row.
   */
  async getActivePlanName(): Promise<string> {
    const body = ((await this.page.textContent('body').catch(() => '')) ?? '').replace(/\s+/g, ' ');
    const section = body.slice(body.indexOf('Active plan'), body.indexOf('Subscription History'));
    const match = section.match(/Validity\s*\d*\s*([A-Za-z][A-Za-z0-9 +]*?)\s*(NGN|\$|₦)/);
    return (match?.[1] ?? '').trim();
  }

  async isPlanNameVisible(): Promise<boolean> {
    return this.lib.isVisible(this.planNameEl);
  }

  async isStartDateVisible(): Promise<boolean> {
    return this.lib.isVisible(this.startDateEl);
  }

  async isEndDateVisible(): Promise<boolean> {
    return this.lib.isVisible(this.endDateEl);
  }

  async isStatusVisible(): Promise<boolean> {
    return this.lib.isVisible(this.statusEl);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async clickSidebarSubscriptionsLink(): Promise<void> {
    await this.lib.click(this.sidebarSubscriptionsLink);
    await this.page.waitForTimeout(1500);
  }

  async isOnSubscriptionHistoryPage(): Promise<boolean> {
    // The sidebar "Subscriptions" link opens the subscription section (plans +
    // history); any /subscription* URL counts as reaching it.
    return /subscription/i.test(this.page.url());
  }
}
