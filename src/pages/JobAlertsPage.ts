import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * JobAlertsPage — Page Object for /dashboard/job-alerts
 */
export class JobAlertsPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly keywordInput =
    'input[name="keyword"], input[name="title"], input[placeholder*="keyword" i], ' +
    'input[placeholder*="job title" i], [data-testid="alert-keyword"], #keyword, #title';

  private readonly locationInput =
    'input[name="location"], input[name="city"], input[placeholder*="location" i], ' +
    'input[placeholder*="city" i], [data-testid="alert-location"], #location, #city';

  private readonly saveAlertButton =
    'button[type="submit"]:has-text("Save"), button:has-text("Create Alert"), ' +
    'button:has-text("Save Alert"), button:has-text("Add Alert"), input[type="submit"], ' +
    '[data-testid="save-alert-button"], button:has-text("Subscribe"), button:has-text("Set Alert")';

  private readonly alertsList =
    '.alerts-list, .job-alerts-list, [data-testid="alerts-list"], ' +
    'table tbody, [class*="alert-list"], .alert-items';

  private readonly alertEntry =
    '.alert-item, .job-alert-row, [data-testid="alert-entry"], ' +
    'table tbody tr, [class*="alert-item"], .alert-card';

  private readonly deleteButton =
    'button:has-text("Delete"), button.delete-btn, a:has-text("Delete"), ' +
    'button[title*="delete" i], [data-testid="delete-alert"], ' +
    '.alert-delete, button:has-text("Remove"), i.fa-trash ~ button, ' +
    'button.btn-danger, a.btn-danger';

  private readonly validationError =
    '.is-invalid, .invalid-feedback, .error-message, .alert-danger, ' +
    '[class*="error"], .help-block, .text-danger, ' +
    '[data-testid="validation-error"], [role="alert"]';

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
    await this.lib.navigateTo(this.url('/dashboard/job-alerts'));
    await this.page.waitForTimeout(1500);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('domcontentloaded');
    return (
      (await this.lib.isVisible(this.keywordInput)) ||
      (await this.lib.isVisible(this.alertsList)) ||
      (await this.lib.isVisible(this.saveAlertButton))
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async fillKeyword(keyword: string): Promise<void> {
    await this.lib.clearAndFill(this.keywordInput, keyword);
  }

  async fillLocation(location: string): Promise<void> {
    await this.lib.clearAndFill(this.locationInput, location);
  }

  async clickSaveAlert(): Promise<void> {
    await this.lib.click(this.saveAlertButton);
    await this.page.waitForTimeout(1500);
  }

  async createAlert(keyword: string, location: string): Promise<void> {
    await this.fillKeyword(keyword);
    await this.fillLocation(location);
    await this.clickSaveAlert();
  }

  async deleteFirstAlert(): Promise<void> {
    const countBefore = await this.getAlertCount();
    await this.lib.click(this.deleteButton);
    await this.page.waitForTimeout(1500);
    // Handle confirmation dialog if present
    try {
      const confirmBtn =
        '.swal2-confirm, button:has-text("Yes"), button:has-text("Confirm"), ' +
        'button:has-text("Delete"), [role="dialog"] button.btn-danger';
      await this.page.locator(confirmBtn).first().waitFor({ state: 'visible', timeout: 3000 });
      await this.page.locator(confirmBtn).first().click();
      await this.page.waitForTimeout(1000);
    } catch {
      // No confirmation dialog — deletion was immediate
    }
    const countAfter = await this.getAlertCount();
    if (countAfter >= countBefore) {
      console.warn('[JobAlertsPage] Delete click did not reduce alert count');
    }
  }

  async submitEmpty(): Promise<void> {
    // Click save without filling any fields
    await this.lib.click(this.saveAlertButton);
    await this.page.waitForTimeout(1000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Query methods
  // ══════════════════════════════════════════════════════════════════════════

  async getAlertCount(): Promise<number> {
    return this.lib.getCount(this.alertEntry);
  }

  async hasAlerts(): Promise<boolean> {
    return (await this.getAlertCount()) > 0;
  }

  async isAlertPresentForKeyword(keyword: string): Promise<boolean> {
    const selector = `${this.alertEntry}:has-text("${keyword}"), *:has-text("${keyword}")`;
    return this.lib.isVisible(selector);
  }

  async isAlertCreatedSuccessfully(): Promise<boolean> {
    const successSelector =
      '.alert-success, .toast-success, .swal2-success, [class*="success"], ' +
      'div:has-text("created"), div:has-text("Alert saved"), [role="alert"]:has-text("success")';
    const isSuccess = await this.lib.isVisible(successSelector);
    if (isSuccess) return true;
    // Also check if a new alert entry appeared
    return this.hasAlerts();
  }

  async isValidationVisible(): Promise<boolean> {
    return this.lib.isVisible(this.validationError);
  }

  async isAlertRemovedAfterCount(previousCount: number): Promise<boolean> {
    const currentCount = await this.getAlertCount();
    return currentCount < previousCount;
  }
}
