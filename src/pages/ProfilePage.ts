import { Page } from 'playwright';
import { BasePage } from './BasePage';

export class ProfilePage extends BasePage {

  private readonly deleteProfileButton =
    'button.btn-danger:has-text("Delete Profile"), button:has-text("Delete Profile")';

  private readonly confirmDeleteButton =
    '.swal2-confirm, ' +
    '.swal2-popup button:has-text("Yes, delete it"), ' +
    '.modal.show button:has-text("Delete"), ' +
    '[role="dialog"] button:has-text("Delete")';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/dashboard/profile'));
    await this.page.waitForTimeout(1500);
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.deleteProfileButton);
  }

  async isDeleteProfileVisible(): Promise<boolean> {
    return this.lib.isVisible(this.deleteProfileButton);
  }

  async deleteProfile(): Promise<void> {
    await this.lib.click(this.deleteProfileButton);
    await this.page.locator(this.confirmDeleteButton).first()
      .waitFor({ state: 'visible', timeout: 10000 });
    await this.page.locator(this.confirmDeleteButton).first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(4000);
  }
}
