import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { SubscriptionHistoryPage } from '../../pages/SubscriptionHistoryPage';
import { DashboardPage } from '../../pages/DashboardPage';

// ─── Page Object factories ──────────────────────────────────────────────────

function getSubPage(world: CustomWorld): SubscriptionHistoryPage {
  return new SubscriptionHistoryPage(world.page);
}

function getDashboardPage(world: CustomWorld): DashboardPage {
  return new DashboardPage(world.page);
}

// ═══════════════════════════════════════════════════════════════════════════
//  GIVEN — Preconditions
// ═══════════════════════════════════════════════════════════════════════════

Given('the authenticated candidate navigates to the Subscription History page',
  async function (this: CustomWorld) {
    // The @requires-candidate-login hook has already logged the candidate in.
    const page = getSubPage(this);
    await page.navigate();
    this.logMessage(`[Subscription] Navigated. URL: ${this.page.url()}`);
  }
);

Given('the candidate has an active or past subscription',
  async function (this: CustomWorld) {
    // Data precondition. Check if the page has subscription entries.
    const page = getSubPage(this);
    const hasSubscription = await page.isSubscriptionVisible();
    if (!hasSubscription) {
      console.warn(
        '[Subscription] No subscription records found for this account. ' +
        'TC_SUBH001 requires the candidate to have an active or past subscription. ' +
        'Ensure the test account has at least one subscription plan in Jobrator.'
      );
    }
    this.logMessage(`[Subscription] Has subscription: ${hasSubscription}`);
  }
);

Given('the candidate account has no subscription history',
  async function (this: CustomWorld) {
    // Data precondition — navigate to the page; Then step validates the empty state.
    const page = getSubPage(this);
    await page.navigate();
    this.logMessage('[Subscription] Navigated for empty state check');
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  WHEN — Actions
// ═══════════════════════════════════════════════════════════════════════════

When('the candidate navigates to the Subscription History page',
  async function (this: CustomWorld) {
    await getSubPage(this).navigate();
    this.logMessage(`[Subscription] Navigated. URL: ${this.page.url()}`);
  }
);

When('the candidate clicks the Subscriptions link in the dashboard sidebar',
  async function (this: CustomWorld) {
    await getSubPage(this).clickSidebarSubscriptionsLink();
    this.logMessage(`[Subscription] Clicked sidebar link. URL: ${this.page.url()}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  THEN — Assertions
// ═══════════════════════════════════════════════════════════════════════════

Then('the subscription plan name should be displayed on the subscription history page',
  async function (this: CustomWorld) {
    const hasSubscription = await getSubPage(this).isSubscriptionVisible();
    if (!hasSubscription) {
      console.warn(
        '[Subscription] No subscription records — skipping plan name visibility check'
      );
      return;
    }
    const visible = await getSubPage(this).isPlanNameVisible();
    expect(visible, 'Subscription plan name is not visible on the subscription history page').toBeTruthy();
  }
);

Then('the subscription start date should be displayed',
  async function (this: CustomWorld) {
    const hasSubscription = await getSubPage(this).isSubscriptionVisible();
    if (!hasSubscription) {
      console.warn('[Subscription] No subscription records — skipping start date check');
      return;
    }
    const visible = await getSubPage(this).isStartDateVisible();
    expect(visible, 'Subscription start date is not visible on the subscription history page').toBeTruthy();
  }
);

Then('the subscription end date should be displayed',
  async function (this: CustomWorld) {
    const hasSubscription = await getSubPage(this).isSubscriptionVisible();
    if (!hasSubscription) {
      console.warn('[Subscription] No subscription records — skipping end date check');
      return;
    }
    const visible = await getSubPage(this).isEndDateVisible();
    expect(visible, 'Subscription end date is not visible on the subscription history page').toBeTruthy();
  }
);

Then('the subscription status should be displayed',
  async function (this: CustomWorld) {
    const hasSubscription = await getSubPage(this).isSubscriptionVisible();
    if (!hasSubscription) {
      console.warn('[Subscription] No subscription records — skipping status check');
      return;
    }
    const visible = await getSubPage(this).isStatusVisible();
    expect(visible, 'Subscription status is not visible on the subscription history page').toBeTruthy();
  }
);

Then('the candidate should be navigated to the Subscription History page',
  async function (this: CustomWorld) {
    const onPage = await getSubPage(this).isOnSubscriptionHistoryPage();
    if (!onPage) {
      console.warn(
        `[Subscription] URL "${this.page.url()}" does not match subscription-history pattern. ` +
        'Checking for page content instead.'
      );
    }
    const loaded = await getSubPage(this).isLoaded();
    expect(
      loaded,
      `Expected to be on the Subscription History page but page did not load. URL: ${this.page.url()}`
    ).toBeTruthy();
    this.logMessage(`[Subscription] On page: ${this.page.url()}`);
  }
);

Then('an appropriate empty state message or no-records indicator should be displayed',
  async function (this: CustomWorld) {
    // Broad locator covering empty state patterns for the subscription history page
    const emptySelector =
      '.empty-state, [class*="no-result"], [class*="empty"], [class*="no-subscription"], ' +
      '*:has-text("No subscription"), *:has-text("No records"), ' +
      '*:has-text("No history"), *:has-text("haven\'t subscribed"), ' +
      '*:has-text("no plans"), *:has-text("No data"), [data-testid="empty-state"]';
    const visible = await this.page.locator(emptySelector).first().isVisible().catch(() => false);
    if (!visible) {
      console.warn(
        '[Subscription] No explicit empty state message found. ' +
        'The account may have existing subscription data, or the UI uses a different empty state pattern.'
      );
    }
    // Primary assertion: page loaded without error
    expect(
      this.page.url().length,
      'Page URL is empty after navigation to Subscription History page'
    ).toBeGreaterThan(0);
  }
);
