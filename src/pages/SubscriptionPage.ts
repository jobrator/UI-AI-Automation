import { Page } from 'playwright';
import { BasePage } from './BasePage';

export class SubscriptionPage extends BasePage {

  // ── Plan display ──────────────────────────────────────────────────────────
  private readonly planName =
    'h1, h2, h3, [class*="plan"] h2, [class*="plan"] h3, [class*="pricing"] h2, ' +
    '[class*="pricing"] h3, [class*="package"] h2, [class*="subscription"] h2, ' +
    '.plan-title, [class*="plan-name"]';

  private readonly planPrice =
    '[class*="price"], [class*="amount"], [class*="cost"], ' +
    '[class*="plan"] [class*="price"], [class*="pricing"] [class*="price"], ' +
    '.price, .amount, span:has-text("NGN"), span:has-text("₦")';

  private readonly featuresList =
    '[class*="feature"], ul[class*="feature"], [class*="benefit"], ul[class*="benefit"], ' +
    '[class*="plan"] ul, [class*="pricing"] ul, [class*="include"], ul li, .feature-list, ' +
    '[class*="plan-features"]';

  // ── Jobrator subscription page ─────────────────────────────────────────────
  private readonly subscribeNowBtn =
    'a:has-text("Subscribe Now"), button:has-text("Subscribe Now"), ' +
    'a:has-text("Subscribe"), [data-testid="subscribe-btn"]';

  // ── SweetAlert confirmation ("Are you sure?") ─────────────────────────────
  private readonly swalConfirmBtn   = '.swal2-confirm, button:has-text("Yes, Sure!")';
  private readonly swalOkBtn        = '.swal2-confirm, button:has-text("OK")';

  // ── Paystack test card ────────────────────────────────────────────────────
  // The Paystack test page renders 4 `.card` divs:
  //   index 0  → outer payment-method selector wrapper
  //   index 1  → "Success" test card   ← we want this
  //   index 2  → "Bank Authentication" test card
  //   index 3  → "Declined" test card
  private readonly successTestCard  = '.card';          // nth(1) below
  private readonly payNowBtn        = '[data-testid="testCardsPaymentButton"], button:has-text("Pay NGN")';

  // ── Post-payment success indicator ────────────────────────────────────────
  private readonly successUrlPattern = /status=success/i;

  // ══════════════════════════════════════════════════════════════════════════
  //  Constructor / navigation
  // ══════════════════════════════════════════════════════════════════════════

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/subscription'));
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.subscribeNowBtn);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Subscription flow
  // ══════════════════════════════════════════════════════════════════════════

  async clickSubscribeNow(): Promise<void> {
    await this.lib.click(this.subscribeNowBtn);
    await this.page.waitForTimeout(1500);
  }

  async confirmSubscriptionModal(): Promise<void> {
    const btn = this.page.locator(this.swalConfirmBtn).first();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
  }

  async waitForPaystackCheckout(): Promise<void> {
    await this.page.waitForURL(/checkout\.paystack\.com/i, { timeout: 20000 });
    await this.page.waitForTimeout(3000);
  }

  async selectSuccessTestCard(): Promise<void> {
    // Success card is the second .card element (index 1)
    const card = this.page.locator(this.successTestCard).nth(1);
    await card.waitFor({ state: 'visible', timeout: 10000 });
    const text = await card.textContent();
    if (!text?.includes('Success')) {
      throw new Error(`Expected "Success" test card at index 1 but found: "${text?.trim()}"`);
    }
    await card.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  async clickPayNow(): Promise<void> {
    const btn = this.page.locator(this.payNowBtn).first();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click({ force: true });
  }

  async waitForSubscriptionSuccess(): Promise<void> {
    await this.page.waitForURL(
      url => /jobrator\.com/i.test(url.toString()) && this.successUrlPattern.test(url.toString()),
      { timeout: 30000 }
    );
    await this.page.waitForTimeout(1000);
  }

  /** Complete the full Paystack "Success" test payment flow in one call. */
  async completeTestSubscription(): Promise<void> {
    await this.navigate();
    await this.clickSubscribeNow();
    await this.confirmSubscriptionModal();
    await this.waitForPaystackCheckout();
    await this.selectSuccessTestCard();
    await this.clickPayNow();
    await this.waitForSubscriptionSuccess();
  }

  isOnSuccessPage(): boolean {
    return this.successUrlPattern.test(this.page.url());
  }

  // ── Public plan display queries ───────────────────────────────────────────

  /** Returns the visible text of the primary plan name heading */
  async getPlanName(): Promise<string> {
    const locator = this.page.locator(this.planName).first();
    return (await locator.innerText()).trim();
  }

  /** Returns true if NGN pricing text is visible on the page */
  async isPriceVisible(): Promise<boolean> {
    return this.lib.isVisible(this.planPrice);
  }

  /** Returns true if a Subscribe Now button is visible */
  async isSubscribeNowVisible(): Promise<boolean> {
    return this.lib.isVisible(this.subscribeNowBtn);
  }

  /** Returns true if the features/benefits list is visible */
  async isFeaturesListVisible(): Promise<boolean> {
    return this.lib.isVisible(this.featuresList);
  }

  /** Returns the count of feature list items */
  async getPlanBenefitsCount(): Promise<number> {
    return this.page.locator(this.featuresList).count();
  }

  /** Returns true if the plan name heading contains the given text */
  async isPlanNameVisible(name: string): Promise<boolean> {
    const selector =
      `h1:has-text("${name}"), h2:has-text("${name}"), h3:has-text("${name}"), ` +
      `[class*="plan"]:has-text("${name}"), [class*="pricing"]:has-text("${name}"), ` +
      `.plan-title:has-text("${name}")`;
    return this.lib.isVisible(selector);
  }

  /** Returns true if the page URL is a payment gateway / checkout URL */
  isOnPaymentGateway(): boolean {
    const url = this.page.url();
    return /paystack|stripe|checkout|payment|pay/i.test(url);
  }

  /** Dismiss the "Subscription Required" modal shown on the CV builder page. */
  async dismissSubscriptionRequiredModal(): Promise<void> {
    const cancelBtn = this.page.locator(
      '.swal2-cancel:has-text("Cancel"), .swal2-popup button:has-text("Cancel")'
    ).first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      await this.page.waitForTimeout(500);
    }
  }
}
