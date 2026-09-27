import { BaseScreen } from './BaseScreen';
import { Locators, Selector } from '../lib/Locators';

/**
 * CompanyProfileScreen — employer More → Company Profile (ADO #29946).
 */
export class CompanyProfileScreen extends BaseScreen {
  private readonly saveButton = this.control('company-save', 'Save');
  private readonly successPopup = Locators.any(
    Locators.accessibilityId('company-profile-updated'),
    Locators.partialText('Updated Successfully'),
    Locators.partialText('updated successfully'),
    Locators.partialText('Success'),
  );

  private readonly fields: Record<string, Selector> = {
    'Company Name': this.control('company-name-input', 'Company Name'),
    'About Company': this.control('about-company-input', 'About Company'),
    'Company Location': this.control('company-location-input', 'Company Location'),
  };

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.saveButton, 10000);
  }

  async editField(field: string, value: string): Promise<void> {
    const selector = this.fields[field];
    if (!selector) {
      throw new Error(
        `No mapping for company field "${field}". Known fields: ${Object.keys(this.fields).join(', ')}`,
      );
    }
    await this.lib.scrollTo(field);
    await this.lib.type(selector, value, `${field} field`);
  }

  async save(): Promise<void> {
    await this.lib.scrollTo('Save');
    await this.lib.tap(this.saveButton, 'Save button');
  }

  async isUpdateSuccessVisible(): Promise<boolean> {
    return this.lib.isVisible(this.successPopup, 20000);
  }

  async dismissSuccessPopup(): Promise<boolean> {
    return this.lib.confirmDialog(['OK', 'Ok', 'Done']);
  }
}
