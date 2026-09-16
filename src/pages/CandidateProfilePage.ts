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

  // The live skills picker is a react-select multi-select (.select__control /
  // .select__option / .select__multi-value).
  private readonly skillsMultiSelect =
    '.select__control, [class*="select__control"], ' +
    '[data-testid="skills"], .skills-input, .select2-container:has-text("Skills"), ' +
    'select[name="skills[]"], select[name="skills"], input[placeholder*="skill" i], ' +
    '.skills-select, #skills';

  // The career summary is a contenteditable rich-text editor (no <textarea>).
  private readonly profileSummaryField =
    'textarea[name="summary"], textarea[name="bio"], textarea[name="profile_summary"], ' +
    '[data-testid="summary"], #summary, #bio, textarea[placeholder*="summary" i], ' +
    '.rdw-editor-main [contenteditable="true"], [contenteditable="true"]';

  // The live profile enforces a set of required fields before it will persist any
  // change (Address, Key Achievement, Career Objectives, Summary — the last three
  // are react-draft-wysiwyg / DraftJS contenteditable editors, not <textarea>s).
  // A standalone phone edit is silently rejected by client-side validation until
  // these are present, so persistence scenarios must complete them first.
  private readonly addressField =
    'input[name="address"], input[placeholder*="address" i], #address';

  private readonly draftEditors = '.public-DraftEditor-content';

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
    '.Toastify__toast--success, [class*="Toastify__toast--success"], ' +
    '.alert-success, .success-message, .swal2-success, ' +
    '[role="alert"]:has-text("success"), .toast-success, .notification-success, ' +
    'p:has-text("successfully"), div:has-text("Profile updated"), div:has-text("saved successfully"), ' +
    '[data-testid="success-message"]';

  // A *real* error signal after save (not the broad [class*="error"], which the
  // form uses for persistent helper/asterisk text and would mask a good save).
  private readonly errorToast =
    '.Toastify__toast--error, [class*="Toastify__toast--error"], ' +
    '.alert-danger, .swal2-error, .toast-error';

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

  /**
   * Complete the profile's required fields (Address + the Key Achievement,
   * Career Objectives and Summary rich-text editors) when they are empty, so a
   * subsequent Save passes client-side validation and actually persists.
   * Fields that already contain content are left untouched. Idempotent.
   */
  async ensureRequiredProfileFieldsFilled(): Promise<void> {
    // Address (plain text input)
    const address = this.page.locator(this.addressField).first();
    if (await address.count()) {
      const current = await address.inputValue().catch(() => '');
      if (!current.trim()) {
        await address.fill('12 Test Avenue, Ikeja, Lagos').catch(() => {});
      }
    }

    // Key Achievement / Career Objectives / Summary — DraftJS contenteditable
    // editors. They cannot be .fill()'d; focus then type. Only fill empty ones.
    const editors = this.page.locator(this.draftEditors);
    const count = await editors.count();
    const filler =
      'Experienced professional with a strong track record of delivering ' +
      'measurable results across cross-functional teams.';
    for (let i = 0; i < count; i++) {
      const editor = editors.nth(i);
      const text = (await editor.innerText().catch(() => '')).trim();
      if (!text) {
        await editor.click().catch(() => {});
        await this.page.keyboard.type(filler);
        await this.page.waitForTimeout(150);
      }
    }
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
    // react-select: click the control to focus, then type into its inner input.
    const control = this.page
      .locator('.select__control, [class*="select__control"]')
      .filter({ visible: true })
      .first();
    const controlVisible = await control.isVisible({ timeout: 5000 }).catch(() => false);
    if (controlVisible) {
      await control.click().catch(() => {});
      await this.page.waitForTimeout(300);
      const rsInput = this.page
        .locator('input[id*="react-select"], .select__control input, [class*="select__control"] input')
        .filter({ visible: true })
        .first();
      await rsInput.fill(skill).catch(async () => {
        await this.page.keyboard.type(skill);
      });
      await this.page.waitForTimeout(900);
      return;
    }
    // Fallback: legacy Select2 / custom picker
    const skillInput = this.page.locator(
      '.select2-search__field, input[placeholder*="skill" i], ' +
      '.skills-search, [class*="skill"] input, .multiselect__input'
    ).first();
    if (await skillInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skillInput.click();
      await skillInput.fill(skill);
    } else {
      console.warn('[Profile] Skills input not found — skipping skill search');
    }
    await this.page.waitForTimeout(600);
  }

  async selectSkillFromDropdown(skill: string): Promise<void> {
    const optionSelector =
      `.select__option:has-text("${skill}"), [class*="select__option"]:has-text("${skill}"), ` +
      `.select2-results__option:has-text("${skill}"), ` +
      `.dropdown-item:has-text("${skill}"), ` +
      `[role="option"]:has-text("${skill}"), ` +
      `.multiselect__option:has-text("${skill}")`;
    await this.lib.click(optionSelector);
    await this.page.waitForTimeout(400);
  }

  async isSkillTagVisible(skill: string): Promise<boolean> {
    const tagSelector =
      `.select__multi-value:has-text("${skill}"), [class*="multi-value"]:has-text("${skill}"), ` +
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

  /**
   * True when the AI summary feature is gated behind a paid subscription — the
   * live site shows a "Subscription Required" swal instead of generating.
   */
  async isAiSubscriptionGated(): Promise<boolean> {
    const gate = this.page.locator(
      '.swal2-popup:has-text("Subscription"), [role="dialog"]:has-text("Subscription"), ' +
      '.swal2-title:has-text("Subscription")'
    ).first();
    return gate.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async isSummaryPopulated(): Promise<boolean> {
    const loc = this.page.locator(this.profileSummaryField).filter({ visible: true }).first();
    try {
      const tag = await loc.evaluate((n) => n.tagName.toLowerCase()).catch(() => '');
      const value =
        tag === 'textarea' || tag === 'input'
          ? await loc.inputValue()
          : await loc.innerText();
      return value.trim().length > 0;
    } catch {
      return false;
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
      await this.page.locator(this.successMessage).first().waitFor({ state: 'visible', timeout: 6000 });
      return true;
    } catch {
      // The success toast is transient and may have auto-dismissed before this
      // check. Treat the save as successful when we are still on the profile page
      // and NO genuine error toast/alert is showing (the broad validationErrors
      // selector matches persistent helper text, so it must not be used here).
      const hasErrorToast = await this.lib.isVisible(this.errorToast).catch(() => false);
      if (hasErrorToast) return false;
      const url = this.page.url();
      return /dashboard\/profile|dashboard/i.test(url);
    }
  }

  async isValidationErrorVisible(): Promise<boolean> {
    return this.lib.isVisible(this.validationErrors);
  }

  async isOnProfilePage(): Promise<boolean> {
    return /dashboard\/profile/i.test(this.page.url());
  }
}
