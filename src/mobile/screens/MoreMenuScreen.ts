import { BaseScreen } from './BaseScreen';
import { Locators } from '../lib/Locators';

/**
 * MoreMenuScreen — the "more" tab that hosts CV Manager, My Profile,
 * Change Password and (for employers) Company Profile.
 */
export class MoreMenuScreen extends BaseScreen {
  private readonly moreTab = this.control('more-tab', 'More');
  private readonly myProfile = this.control('my-profile', 'My Profile');
  private readonly changePassword = this.control('change-password', 'Change Password');
  private readonly companyProfile = this.control('company-profile', 'Company Profile');

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.moreTab, 8000) || this.lib.isVisible(this.myProfile, 8000);
  }

  async open(): Promise<void> {
    await this.lib.tap(this.moreTab, '"more" menu');
  }

  async openMyProfile(): Promise<void> {
    await this.lib.scrollTo('My Profile');
    await this.lib.tap(this.myProfile, 'My Profile');
  }

  async openChangePassword(): Promise<void> {
    await this.lib.scrollTo('Change Password');
    await this.lib.tap(this.changePassword, 'Change Password option');
  }

  async openCompanyProfile(): Promise<void> {
    await this.lib.scrollTo('Company Profile');
    await this.lib.tap(this.companyProfile, 'Company Profile');
  }

  /** Tap any labelled entry on the more menu — used by the generic step. */
  async openEntry(label: string): Promise<void> {
    await this.lib.scrollTo(label);
    await this.lib.tap(
      Locators.any(Locators.accessibilityId(label), Locators.text(label), Locators.partialText(label)),
      label,
    );
  }
}
