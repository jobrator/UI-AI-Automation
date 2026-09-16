import { BaseScreen } from './BaseScreen';
import { Locators, Selector } from '../lib/Locators';

/**
 * CandidateProfileScreen — More → My Profile.
 *
 * Drives ADO #29942. The repro edits a long list of fields and then expects a
 * "profile Updated Successfully" popup, so the field map is keyed by the label
 * used in the Gherkin to keep the step definitions declarative.
 */
export class CandidateProfileScreen extends BaseScreen {
  private readonly saveButton = this.control('profile-save', 'Save');
  private readonly successPopup = Locators.any(
    Locators.accessibilityId('profile-updated'),
    Locators.partialText('Updated Successfully'),
    Locators.partialText('updated successfully'),
    Locators.partialText('Success'),
  );

  /** Text fields, keyed by the name used in the feature file. */
  private readonly fields: Record<string, Selector> = {
    'First Name': this.control('first-name-input', 'First Name'),
    'Last Name': this.control('last-name-input', 'Last Name'),
    'Mobile Number': this.control('mobile-number-input', 'Mobile Number'),
    Address: this.control('address-input', 'Address'),
    State: this.control('state-input', 'State'),
    City: this.control('city-input', 'City'),
    ZipCode: this.control('zipcode-input', 'ZipCode'),
    Summary: this.control('summary-input', 'Summary'),
  };

  /** Pickers that open a wheel/list and are confirmed with "Done". */
  private readonly pickers: Record<string, Selector> = {
    Pronoun: this.control('pronoun-picker', 'Pronoun'),
    'Date of Birth': this.control('dob-picker', 'Date of Birth'),
    Country: this.control('country-picker', 'Country'),
    Gender: this.control('gender-picker', 'Gender'),
    Skills: this.control('skills-picker', 'Skills'),
  };

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.saveButton, 10000);
  }

  async editField(field: string, value: string): Promise<void> {
    const selector = this.fields[field];
    if (!selector) {
      throw new Error(
        `No mapping for profile field "${field}". Known fields: ${Object.keys(this.fields).join(', ')}`,
      );
    }
    await this.lib.scrollTo(field);
    await this.lib.type(selector, value, `${field} field`);
  }

  /** Open a picker, take the first offered option, and confirm with Done. */
  async selectFromPicker(picker: string): Promise<void> {
    const selector = this.pickers[picker];
    if (!selector) {
      throw new Error(
        `No mapping for picker "${picker}". Known pickers: ${Object.keys(this.pickers).join(', ')}`,
      );
    }
    await this.lib.scrollTo(picker);
    await this.lib.tap(selector, `${picker} picker`);
    await this.driver.pause(1200);

    // Take whichever option the wheel is already showing, then confirm.
    await this.lib.tapIfPresent(
      this.cfg.isAndroid
        ? ['android=new UiSelector().className("android.widget.CheckedTextView").instance(0)']
        : ['(//XCUIElementTypePickerWheel)[1]'],
      `${picker} first option`,
      4000,
    );
    const confirmed = await this.lib.confirmDialog(['Done', 'OK', 'Ok', 'Select', 'Apply']);
    if (!confirmed) {
      throw new Error(`Opened the ${picker} picker but found no Done/OK control to confirm it.`);
    }
  }

  async save(): Promise<void> {
    await this.lib.scrollTo('Save');
    await this.lib.tap(this.saveButton, 'Save button');
  }

  async isUpdateSuccessVisible(): Promise<boolean> {
    return this.lib.isVisible(this.successPopup, 20000);
  }

  /** Read a field back, so persistence can be asserted after a reload. */
  async readField(field: string): Promise<string> {
    const selector = this.fields[field];
    if (!selector) throw new Error(`No mapping for profile field "${field}".`);
    await this.lib.scrollTo(field);
    return this.lib.getText(selector, `${field} field`);
  }
}
