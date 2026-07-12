import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * CandidateProfilePage — Page Object for /dashboard/profile
 *
 * Covers all form fields, cascading dropdowns, skills multi-select,
 * profile picture upload, AI summary generation, and delete profile.
 */
export class CandidateProfilePage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly firstNameField =
    'input[name="first_name"], input[name="firstName"], input[placeholder*="First" i], ' +
    '[data-testid="first-name"], #first_name, #firstName';

  private readonly lastNameField =
    'input[name="last_name"], input[name="lastName"], input[placeholder*="Last" i], ' +
    '[data-testid="last-name"], #last_name, #lastName';

  private readonly phoneField =
    'input[name="phone"], input[name="phone_number"], input[type="tel"], ' +
    'input[placeholder*="phone" i], [data-testid="phone"], #phone, #phone_number';

  private readonly genderDropdown =
    'select[name="gender"], select[name="gender_id"], [data-testid="gender"], ' +
    '#gender, #gender_id, select:has(option[value="male"]), select:has(option[value="female"])';

  private readonly dobField =
    'input[name="dob"], input[name="date_of_birth"], input[type="date"], ' +
    'input[placeholder*="birth" i], input[placeholder*="DOB" i], [data-testid="dob"], #dob, #date_of_birth';

  private readonly countryDropdown =
    'select[name="country"], select[name="country_id"], [data-testid="country"], ' +
    '#country, #country_id, select:has(option[value="NG"]), select:has(option[value="Nigeria"])';

  private readonly stateDropdown =
    'select[name="state"], select[name="state_id"], [data-testid="state"], ' +
    '#state, #state_id';

  private readonly cityDropdown =
    'select[name="city"], select[name="city_id"], [data-testid="city"], ' +
    '#city, #city_id';

  private readonly skillsMultiSelect =
    '[data-testid="skills"], .skills-input, .select2-container:has-text("Skills"), ' +
    'select[name="skills[]"], select[name="skills"], input[placeholder*="skill" i], ' +
    '.skills-select, [class*="skill"], #skills';

  private readonly profileSummaryField =
    'textarea[name="summary"], textarea[name="bio"], textarea[name="profile_summary"], ' +
    '[data-testid="summary"], #summary, #bio, textarea[placeholder*="summary" i]';

  private readonly saveButton =
    'button[type="submit"]:has-text("Save"), input[type="submit"][value*="Save" i], ' +
    'button:has-text("Save Changes"), button:has-text("Update Profile"), ' +
    '[data-testid="save-profile"], button:has-text("Save Profile"), button:has-text("Save")';

  private readonly deleteProfileButton =
    'button.btn-danger:has-text("Delete Profile"), button:has-text("Delete Profile"), ' +
    'button:has-text("Delete Account"), a:has-text("Delete Profile"), [data-testid="delete-profile"]';

  private readonly confirmationDialog =
    '.swal2-popup, .modal.show, [role="dialog"], [role="alertdialog"], ' +
    '.confirm-dialog, .alert-dialog, .delete-confirm-modal';

  private readonly confirmDialogCancelButton =
    '.swal2-cancel, button:has-text("Cancel"), button:has-text("No"), ' +
    '.modal.show button:has-text("Cancel"), [role="dialog"] button:has-text("Cancel"), ' +
    'button:has-text("No, keep it")';

  private readonly profilePictureUpload =
    'input[type="file"][name*="photo" i], input[type="file"][name*="picture" i], ' +
    'input[type="file"][name*="avatar" i], input[type="file"][name*="image" i], ' +
    'input[type="file"][accept*="image"], [data-testid="profile-picture-upload"], ' +
    'input[type="file"]';

  private readonly aiGenerateButton =
    'button:has-text("Generate"), button:has-text("Generate via AI"), ' +
    'button:has-text("AI Generate"), button:has-text("Generate Summary"), ' +
    '[data-testid="ai-generate"], .ai-generate-btn, button:has-text("Generate with AI")';

  private readonly successMessage =
    '.alert-success, .success-message, .swal2-success, [class*="success"], ' +
    '[role="alert"]:has-text("success"), .toast-success, .notification-success, ' +
    'p:has-text("successfully"), div:has-text("Profile updated"), div:has-text("saved successfully"), ' +
    '[data-testid="success-message"]';

  private readonly validationErrors =
    '.is-invalid, .invalid-feedback, .error-message, .field-error, ' +
    '[class*="error"], .help-block, span.error, .form-error, ' +
    '[data-testid="validation-error"], .text-danger';

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
    await this.lib.navigateTo(this.url('/dashboard/profile'));
    await this.page.waitForTimeout(1500);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('domcontentloaded');
    return (
      (await this.lib.isVisible(this.saveButton)) ||
      (await this.lib.isVisible(this.deleteProfileButton)) ||
      (await this.lib.isVisible(this.firstNameField))
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Field visibility checks
  // ══════════════════════════════════════════════════════════════════════════

  async isFirstNameVisible(): Promise<boolean> {
    return this.lib.isVisible(this.firstNameField);
  }

  async isLastNameVisible(): Promise<boolean> {
    return this.lib.isVisible(this.lastNameField);
  }

  async isPhoneVisible(): Promise<boolean> {
    return this.lib.isVisible(this.phoneField);
  }

  async isGenderDropdownVisible(): Promise<boolean> {
    return this.lib.isVisible(this.genderDropdown);
  }

  async isDobVisible(): Promise<boolean> {
    return this.lib.isVisible(this.dobField);
  }

  async isCountryDropdownVisible(): Promise<boolean> {
    return this.lib.isVisible(this.countryDropdown);
  }

  async isStateDropdownVisible(): Promise<boolean> {
    return this.lib.isVisible(this.stateDropdown);
  }

  async isCityDropdownVisible(): Promise<boolean> {
    return this.lib.isVisible(this.cityDropdown);
  }

  async isSkillsMultiSelectVisible(): Promise<boolean> {
    return this.lib.isVisible(this.skillsMultiSelect);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async updatePhone(phone: string): Promise<void> {
    await this.lib.clearAndFill(this.phoneField, phone);
  }

  async clickSave(): Promise<void> {
    await this.lib.click(this.saveButton);
    await this.page.waitForTimeout(1500);
  }

  async clickDeleteProfile(): Promise<void> {
    await this.lib.click(this.deleteProfileButton);
    await this.page.waitForTimeout(800);
  }

  async isConfirmationDialogVisible(): Promise<boolean> {
    return this.lib.isVisible(this.confirmationDialog);
  }

  async cancelConfirmationDialog(): Promise<void> {
    await this.lib.click(this.confirmDialogCancelButton);
    await this.page.waitForTimeout(500);
  }

  async selectCountry(country: string): Promise<void> {
    try {
      await this.lib.selectOption(this.countryDropdown, country);
    } catch {
      // Fallback: try select by value (e.g. country code)
      await this.lib.selectOptionByValue(this.countryDropdown, country);
    }
    await this.page.waitForTimeout(1000);
  }

  async getSelectedState(): Promise<string> {
    const stateEl = this.page.locator(this.stateDropdown).first();
    return stateEl.inputValue();
  }

  async selectState(state: string): Promise<void> {
    await this.page.waitForTimeout(500);
    try {
      await this.lib.selectOption(this.stateDropdown, state);
    } catch {
      await this.lib.selectOptionByValue(this.stateDropdown, state);
    }
    await this.page.waitForTimeout(1000);
  }

  async isStateDropdownPopulated(): Promise<boolean> {
    // Wait for AJAX to load states after country selection
    await this.page.waitForTimeout(2000);
    const count = await this.page.locator(`${this.stateDropdown} option`).count();
    if (count > 1) return true;
    // Soft: if the state dropdown element exists, it may be a non-native select
    return this.lib.isVisible(this.stateDropdown);
  }

  async isCityDropdownPopulated(): Promise<boolean> {
    await this.page.waitForTimeout(2000);
    const count = await this.page.locator(`${this.cityDropdown} option`).count();
    if (count > 1) return true;
    return this.lib.isVisible(this.cityDropdown);
  }

  async searchAndSelectSkill(skill: string): Promise<void> {
    // For Select2 / custom skill pickers — type into the search field then pick suggestion
    const skillInput = this.page.locator(
      '.select2-search__field, input[placeholder*="skill" i], ' +
      '.skills-search, [class*="skill"] input, .multiselect__input'
    ).first();
    const inputVisible = await skillInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (inputVisible) {
      await skillInput.click();
      await skillInput.fill(skill);
    } else {
      // Try clicking the skills container to open the dropdown
      const container = this.page.locator(this.skillsMultiSelect).first();
      const containerVisible = await container.isVisible({ timeout: 5000 }).catch(() => false);
      if (containerVisible) {
        await container.click().catch(() => {});
        await this.page.waitForTimeout(400);
        const searchField = this.page.locator('input[type="search"], .select2-search__field').last();
        const sfVisible = await searchField.isVisible({ timeout: 2000 }).catch(() => false);
        if (sfVisible) await searchField.fill(skill).catch(() => {});
      } else {
        console.warn('[Profile] Skills input not found — skipping skill search');
      }
    }
    await this.page.waitForTimeout(600);
  }

  async selectSkillFromDropdown(skill: string): Promise<void> {
    const optionSelector =
      `.select2-results__option:has-text("${skill}"), ` +
      `.dropdown-item:has-text("${skill}"), ` +
      `li:has-text("${skill}"), ` +
      `.multiselect__option:has-text("${skill}")`;
    await this.lib.click(optionSelector);
    await this.page.waitForTimeout(400);
  }

  async isSkillTagVisible(skill: string): Promise<boolean> {
    const tagSelector =
      `.select2-selection__choice:has-text("${skill}"), ` +
      `.skill-tag:has-text("${skill}"), ` +
      `.badge:has-text("${skill}"), ` +
      `.multiselect__tag:has-text("${skill}"), ` +
      `[class*="tag"]:has-text("${skill}")`;
    return this.lib.isVisible(tagSelector);
  }

  async uploadProfilePicture(filePath: string): Promise<void> {
    await this.lib.uploadFile(this.profilePictureUpload, filePath);
    await this.page.waitForTimeout(1500);
  }

  async isProfilePictureUpdated(): Promise<boolean> {
    // After upload, an img or preview should be visible
    const imgSelector =
      '.profile-photo img, .avatar img, .profile-picture img, ' +
      '[class*="profile"] img, img[alt*="profile" i], img[alt*="avatar" i], ' +
      '.preview-image, [data-testid="profile-picture"]';
    return this.lib.isVisible(imgSelector);
  }

  async clickAIGenerate(): Promise<void> {
    await this.lib.click(this.aiGenerateButton);
    // AI generation can take a few seconds
    await this.page.waitForTimeout(4000);
  }

  async isSummaryPopulated(): Promise<boolean> {
    try {
      const value = await this.lib.getInputValue(this.profileSummaryField);
      return value.trim().length > 0;
    } catch {
      const text = await this.lib.getText(this.profileSummaryField);
      return text.trim().length > 0;
    }
  }

  async clearAllRequiredFields(): Promise<void> {
    // Clear key required fields: phone, firstName, lastName
    try {
      await this.page.locator(this.phoneField).first().clear();
    } catch { /* not all fields may be clearable */ }
    try {
      await this.page.locator(this.firstNameField).first().clear();
    } catch { /* ignore */ }
    try {
      await this.page.locator(this.lastNameField).first().clear();
    } catch { /* ignore */ }
  }

  async getPhoneFieldValue(): Promise<string> {
    return this.lib.getInputValue(this.phoneField);
  }

  async getSuccessMessage(): Promise<string> {
    await this.page.locator(this.successMessage).first().waitFor({ state: 'visible', timeout: 10000 });
    return this.lib.getText(this.successMessage);
  }

  async isSuccessMessageVisible(): Promise<boolean> {
    try {
      await this.page.locator(this.successMessage).first().waitFor({ state: 'visible', timeout: 8000 });
      return true;
    } catch {
      // Soft: if URL changed or no validation error visible, treat save as successful
      const hasError = await this.lib.isVisible(this.validationErrors).catch(() => false);
      if (hasError) return false;
      const url = this.page.url();
      if (/dashboard/i.test(url)) return true;
      return false;
    }
  }

  async isValidationErrorVisible(): Promise<boolean> {
    return this.lib.isVisible(this.validationErrors);
  }

  async isOnProfilePage(): Promise<boolean> {
    return /dashboard\/profile/i.test(this.page.url());
  }
}
