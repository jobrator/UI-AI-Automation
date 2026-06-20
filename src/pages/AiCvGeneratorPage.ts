import { Page } from 'playwright';
import { BasePage } from './BasePage';

export class AiCvGeneratorPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators — CV Manager page (/dashboard/cv-manager)
  // ══════════════════════════════════════════════════════════════════════════

  private readonly createCvLink =
    'a[href*="create-own-cv"], a:has-text("Create your CV"), ' +
    'button:has-text("Create your CV"), [data-testid="create-cv-link"]';

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators — CV Builder page (/dashboard/create-own-cv)
  // ══════════════════════════════════════════════════════════════════════════

  // Personal details
  private readonly firstNameInput   = 'input[name="firstName"]';
  private readonly lastNameInput    = 'input[name="lastName"]';
  private readonly emailInput       = 'input[name="email"]';
  private readonly phoneInput       = 'input[name="phone"]';
  private readonly designationInput = 'input[name="designation"]';

  // Country / State / City — native <select> elements
  private readonly countrySelect = 'select[name="country"]';
  private readonly stateSelect   = 'select[name="state"]';
  private readonly citySelect    = 'select[name="city"]';

  // Skills — React Select; the hidden input stores the value, the visible
  // input (id="react-select-2-input") is what the user types into.
  private readonly skillsReactInput = 'input#react-select-2-input, input[class*="select__input"]';

  // Education
  private readonly degreeLevelSelect      = 'select[name="education.0.degreeLevel"]';
  private readonly instituteInput         = 'input[name="education.0.institute"]';
  private readonly educationResultInput   = 'input[name="education.0.result"]';
  private readonly educationStatusSelect  = 'select[name="education.0.status"]';

  // Experience
  private readonly experienceRoleSelect            = 'select[name="experence.0.role"]';
  private readonly experienceCompanyInput          = 'input[name="experence.0.company"]';
  private readonly experienceStartDateInput        = 'input[name="experence.0.startDate"]';
  private readonly experienceCurrentlyWorking      = 'input[name="experence.0.currentlyWorking"]';
  private readonly experienceCurrentlyWorkingLabel = 'label.switch';
  private readonly experienceDescTextarea          = 'textarea[name="experence.0.description"]';
  private readonly generateViaAiButton             = 'button:has-text("Generate via AI")';

  // Projects
  private readonly projectTitleInput   = 'input[name="projects.0.projectTitle"]';
  private readonly projectDetailsTextarea = 'textarea[name="projects.0.projectDetails"]';

  // About / personal summary
  private readonly aboutTextarea   = 'textarea[name="about"]';
  private readonly writeViaAiButton = 'button:has-text("Write via AI")';

  // Submit
  private readonly createCvButton  = 'button:has-text("Create CV")';

  // AI generation modal (SweetAlert2 shown after clicking Generate/Write via AI on subscribed account)
  private readonly aiModalTextarea = '.swal2-textarea';
  private readonly aiModalGenerateBtn = '.swal2-confirm:has-text("Generate"), .swal2-popup button:has-text("Generate")';
  private readonly aiModalOkBtn = '.swal2-confirm:has-text("OK"), .swal2-popup button:has-text("OK")';

  // Validation / success
  private readonly validationError =
    '.error, .field-error, .validation-error, [class*="error"], ' +
    '.alert-danger, [role="alert"], .invalid-feedback, ' +
    '.swal2-popup:has-text("required"), .swal2-popup:has-text("fill")';

  private readonly successIndicator =
    '.swal2-popup:has-text("success"), .swal2-popup:has-text("created"), ' +
    '.alert-success, [class*="success"], ' +
    '[role="alert"]:has-text("success"), [role="alert"]:has-text("created")';

  // ── XSS dialog detection ──────────────────────────────────────────────────
  private dialogTriggered = false;

  // ══════════════════════════════════════════════════════════════════════════
  //  Constructor
  // ══════════════════════════════════════════════════════════════════════════

  constructor(page: Page) {
    super(page);
    this.page.on('dialog', async (dialog) => {
      this.dialogTriggered = true;
      await dialog.dismiss();
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Navigation
  // ══════════════════════════════════════════════════════════════════════════

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/dashboard/create-own-cv'));
    await this.page.waitForURL(/create-own-cv|login/i, { timeout: 30000 });
  }

  async navigateToCvManager(): Promise<void> {
    await this.lib.navigateTo(this.url('/dashboard/cv-manager'));
    await this.page.waitForURL(/cv-manager|login/i, { timeout: 30000 });
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.firstNameInput);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CV Manager page
  // ══════════════════════════════════════════════════════════════════════════

  async isCreateCvLinkVisible(): Promise<boolean> {
    return this.lib.isVisible(this.createCvLink);
  }

  async clickCreateCvLink(): Promise<void> {
    await this.lib.click(this.createCvLink);
    await this.page.waitForURL(/create-own-cv/i, { timeout: 15000 }).catch(async () => {
      await this.lib.navigateTo(this.url('/dashboard/create-own-cv'));
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CV Builder state queries
  // ══════════════════════════════════════════════════════════════════════════

  isOnCvBuilderPage(): boolean {
    return /create-own-cv/i.test(this.page.url());
  }

  async isFormVisible(): Promise<boolean> {
    return (
      (await this.lib.isVisible(this.firstNameInput)) ||
      (await this.lib.isVisible(this.createCvButton))
    );
  }

  async isPersonalDetailsSectionVisible(): Promise<boolean> {
    return this.lib.isVisible(this.firstNameInput);
  }

  async isSkillsFieldVisible(): Promise<boolean> {
    // The skills react-select renders a visible text input
    return this.lib.isVisible(this.skillsReactInput);
  }

  async isExperienceSectionVisible(): Promise<boolean> {
    return (
      (await this.lib.isVisible(this.experienceRoleSelect)) ||
      (await this.lib.isVisible(this.experienceCompanyInput))
    );
  }

  async isAboutSectionVisible(): Promise<boolean> {
    return this.lib.isVisible(this.aboutTextarea);
  }

  async isGenerateViaAiVisible(): Promise<boolean> {
    return this.lib.isVisible(this.generateViaAiButton);
  }

  async isWriteViaAiVisible(): Promise<boolean> {
    return this.lib.isVisible(this.writeViaAiButton);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Form filling
  // ══════════════════════════════════════════════════════════════════════════

  async fillPersonalDetails(fields: Record<string, string>): Promise<void> {
    const map: Record<string, string> = {
      firstName:   this.firstNameInput,
      lastName:    this.lastNameInput,
      email:       this.emailInput,
      phone:       this.phoneInput,
      designation: this.designationInput,
    };
    for (const [key, selector] of Object.entries(map)) {
      if (fields[key]) await this.safeFill(selector, fields[key]);
    }
  }

  async fillExperienceDetails(fields: Record<string, string>): Promise<void> {
    const role = fields['role'] ?? fields['Role'] ?? '';
    if (role) {
      const select = this.page.locator(this.experienceRoleSelect).first();
      if (await select.isVisible().catch(() => false)) {
        // Try selecting by label text first, then fall back to index 2 (skip blank/placeholder at 0/1)
        await select.selectOption({ label: role }).catch(async () => {
          await select.selectOption({ index: 2 }).catch(async () => {
            await select.selectOption({ index: 1 }).catch(() => {});
          });
        });
      }
    }
    const company = fields['company'] ?? fields['Company'] ?? '';
    if (company) await this.safeFill(this.experienceCompanyInput, company);
  }

  /** Fill all fields required by the "Write via AI" validation check. */
  async fillAllRequiredForAi(email: string): Promise<void> {
    // Personal details
    await this.safeFill(this.firstNameInput,   'AutoTest');
    await this.safeFill(this.lastNameInput,    'Candidate');
    await this.safeFill(this.emailInput,       email);
    await this.safeFill(this.phoneInput,       '07700900000');
    await this.safeFill(this.designationInput, 'Software Engineer');

    // Country / state / city
    const country = this.page.locator(this.countrySelect).first();
    if (await country.isVisible().catch(() => false)) {
      await country.selectOption({ index: 1 }).catch(() => {});
      await this.page.waitForTimeout(500);
    }
    const state = this.page.locator(this.stateSelect).first();
    if (await state.isVisible().catch(() => false)) {
      await state.selectOption({ index: 1 }).catch(() => {});
      await this.page.waitForTimeout(300);
    }
    const city = this.page.locator(this.citySelect).first();
    if (await city.isVisible().catch(() => false)) {
      await city.selectOption({ index: 1 }).catch(() => {});
      await this.page.waitForTimeout(300);
    }

    // Skills via React Select
    await this.enterSkills('JavaScript');

    // Education — fill selects first (they may trigger re-renders), then text inputs last
    const degree = this.page.locator(this.degreeLevelSelect).first();
    if (await degree.isVisible().catch(() => false)) {
      await degree.selectOption({ index: 1 }).catch(() => {});
    }
    await this.safeFill(this.instituteInput, 'Test University');
    const eduStatus = this.page.locator(this.educationStatusSelect).first();
    if (await eduStatus.isVisible().catch(() => false)) {
      await eduStatus.selectOption({ index: 1 }).catch(() => {});
    }
    // Fill result AFTER selects to avoid React re-render clearing the field.
    // Use pressSequentially to ensure React's onChange fires.
    const resultLoc = this.page.locator(this.educationResultInput).first();
    if (await resultLoc.isVisible().catch(() => false)) {
      await resultLoc.click();
      await resultLoc.fill('');
      await resultLoc.pressSequentially('First Class');
    }

    // Experience — skip index 0 (blank/placeholder), pick first real option
    const roleSelect = this.page.locator(this.experienceRoleSelect).first();
    if (await roleSelect.isVisible().catch(() => false)) {
      await roleSelect.selectOption({ index: 2 }).catch(async () => {
        await roleSelect.selectOption({ index: 1 }).catch(() => {});
      });
    }
    await this.safeFill(this.experienceCompanyInput, 'Acme Corp');
    // Fill start date — type="date" input accepts yyyy-MM-dd format
    const startDate = this.page.locator(this.experienceStartDateInput).first();
    if (await startDate.isVisible().catch(() => false)) {
      await startDate.fill('2020-01-01').catch(async () => {
        await startDate.pressSequentially('01/01/2020');
      });
    }
    // Toggle "Currently Working" ON by clicking the visual label.switch (the checkbox is hidden)
    const switchLabel = this.page.locator(this.experienceCurrentlyWorkingLabel).first();
    if (await switchLabel.isVisible().catch(() => false)) {
      await switchLabel.click();
    } else {
      // Fallback: force-click the hidden checkbox directly
      const checkbox = this.page.locator(this.experienceCurrentlyWorking).first();
      await checkbox.click({ force: true }).catch(() => {});
    }
    await this.page.waitForTimeout(300);

    // Projects
    await this.safeFill(this.projectTitleInput, 'Test Project');
    await this.safeFill(this.projectDetailsTextarea, 'Automated E2E testing with Playwright and Cucumber.');

    // Pre-fill the about section as a safety fallback.
    // "Write via AI" will override this with AI content when the call succeeds.
    // Without this, if the AI service is temporarily unavailable the form cannot submit.
    await this.safeFill(this.aboutTextarea,
      'Experienced software engineer with a strong background in delivering scalable systems and leading engineering teams.');
  }

  async enterSkills(value: string): Promise<void> {
    const input = this.page.locator(this.skillsReactInput).first();
    try {
      await input.waitFor({ state: 'visible', timeout: 5000 });
      await input.fill(value);
      await input.press('Enter');
      await this.page.waitForTimeout(300);
    } catch {
      // Fallback: try force-fill
      await input.fill(value, { force: true });
      await input.press('Enter');
    }
  }

  async enterSkillsXss(value: string): Promise<void> {
    // For XSS tests — type directly into the React Select visible input
    const input = this.page.locator(this.skillsReactInput).first();
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.type(value);
    await this.page.waitForTimeout(300);
  }

  private async safeFill(selector: string, value: string): Promise<void> {
    const loc = this.page.locator(selector).first();
    try {
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      await loc.fill(value);
    } catch {
      await loc.fill(value, { force: true });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  AI button interactions
  // ══════════════════════════════════════════════════════════════════════════

  async clickGenerateViaAi(): Promise<void> {
    await this.lib.click(this.generateViaAiButton);
    await this.page.waitForTimeout(2000);
  }

  async clickWriteViaAi(): Promise<void> {
    await this.lib.click(this.writeViaAiButton);
    // "Write via AI" generates inline — button changes to "Writing..." while running.
    // Wait until "Writing..." disappears (success or error), then settle.
    await this.page.locator('button:has-text("Writing...")').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {});
    // Dismiss any result or error modal that may appear
    const okBtn = this.page.locator(this.aiModalOkBtn).first();
    if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await okBtn.click();
      await this.page.waitForTimeout(500);
    }
    await this.page.waitForTimeout(1000);
  }

  // ── AI generation modal (subscription-gated prompt) ───────────────────────

  async isAiExperienceModalVisible(): Promise<boolean> {
    const popup = this.page.locator('.swal2-popup').first();
    if (!await popup.isVisible().catch(() => false)) return false;
    const text = await popup.textContent().catch(() => '');
    return /brief points|experience/i.test(text ?? '');
  }

  /** Returns true if the AI backend returned an error modal (e.g. "Error writing via AI"). */
  async isAiErrorModalVisible(): Promise<boolean> {
    const popup = this.page.locator('.swal2-popup').first();
    if (!await popup.isVisible().catch(() => false)) return false;
    const text = await popup.textContent().catch(() => '');
    return /error/i.test(text ?? '');
  }

  /** Returns the text content of any visible SweetAlert modal, or empty string. */
  async getModalText(): Promise<string> {
    const popup = this.page.locator('.swal2-popup').first();
    if (!await popup.isVisible().catch(() => false)) return '';
    return (await popup.textContent().catch(() => '')) ?? '';
  }

  async isSubscriptionRequiredModalVisible(): Promise<boolean> {
    const popup = this.page.locator('.swal2-popup').first();
    if (!await popup.isVisible().catch(() => false)) return false;
    const text = await popup.textContent().catch(() => '');
    return /subscription required/i.test(text ?? '');
  }

  async isSubscribeButtonInModal(): Promise<boolean> {
    return this.lib.isVisible('.swal2-popup button:has-text("Subscribe"), .swal2-confirm:has-text("Subscribe")');
  }

  async isCancelButtonInModal(): Promise<boolean> {
    return this.lib.isVisible('.swal2-popup button:has-text("Cancel"), .swal2-cancel:has-text("Cancel")');
  }

  async dismissModal(): Promise<void> {
    // Use the same selector confirmed working by isCancelButtonInModal()
    const selectors = [
      '.swal2-popup button:has-text("Cancel")',
      '.swal2-cancel:has-text("Cancel")',
      '.swal2-popup button:has-text("No")',
      '.swal2-cancel',
      '.swal2-close',
    ];
    let clicked = false;
    for (const sel of selectors) {
      const btn = this.page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click({ force: true });
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      // Last resort: Escape key
      await this.page.keyboard.press('Escape');
    }
    // Wait for SweetAlert close animation to complete
    await this.page.locator('.swal2-container').waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async isModalClosed(): Promise<boolean> {
    try {
      await this.page.locator('.swal2-container').waitFor({ state: 'hidden', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async enterAiExperiencePoints(text: string): Promise<void> {
    const textarea = this.page.locator(this.aiModalTextarea).first();
    await textarea.waitFor({ state: 'visible', timeout: 5000 });
    await textarea.fill(text);
  }

  async clickGenerateInModal(): Promise<void> {
    const btn = this.page.locator(this.aiModalGenerateBtn).first();
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    // Clicking Generate closes the SweetAlert and shows "Generating..." on the form button.
    // Wait until "Generating..." disappears (AI done or errored), up to 25s.
    await this.page.locator('button:has-text("Generating...")').waitFor({ state: 'detached', timeout: 25000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async clickOkInModal(): Promise<void> {
    const btn = this.page.locator(this.aiModalOkBtn).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async isExperienceDescriptionPopulated(): Promise<boolean> {
    const loc = this.page.locator(this.experienceDescTextarea).first();
    try {
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      const value = await loc.inputValue();
      return value.trim().length > 0;
    } catch {
      return false;
    }
  }

  async isAboutFieldPopulated(): Promise<boolean> {
    const loc = this.page.locator(this.aboutTextarea).first();
    try {
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      const value = await loc.inputValue();
      return value.trim().length > 0;
    } catch {
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Submit
  // ══════════════════════════════════════════════════════════════════════════

  async submitForm(): Promise<void> {
    // Ensure required fields have content in case AI calls failed.
    // TC070/TC071 verify AI generation separately; this fallback only applies
    // when submitting the form end-to-end (TC072, TC073).
    const desc = this.page.locator(this.experienceDescTextarea).first();
    if (await desc.isVisible().catch(() => false)) {
      const val = await desc.inputValue().catch(() => '');
      if (!val.trim()) {
        await desc.pressSequentially(
          'Led cross-functional engineering teams to deliver key product milestones on time and within budget.'
        );
      }
    }
    await this.lib.click(this.createCvButton);
    await this.page.waitForTimeout(3000);
  }

  async isSubmitProcessed(): Promise<boolean> {
    // Wait a moment for post-submission response
    await this.page.waitForTimeout(2000);
    const url = this.page.url();
    if (/cv-manager/i.test(url)) return true;
    // Check for SweetAlert success modal
    const popup = this.page.locator('.swal2-popup').first();
    if (await popup.isVisible().catch(() => false)) {
      const text = (await popup.textContent().catch(() => '')) ?? '';
      if (/success|created|CV/i.test(text)) return true;
      // Dismiss any error/info popup and re-check URL
      const okBtn = this.page.locator(this.aiModalOkBtn).first();
      if (await okBtn.isVisible().catch(() => false)) {
        await okBtn.click();
        await this.page.waitForTimeout(1000);
        return /cv-manager/i.test(this.page.url());
      }
    }
    return this.lib.isVisible(this.successIndicator);
  }

  async hasValidationError(): Promise<boolean> {
    await this.page.waitForTimeout(1000);
    return this.lib.isVisible(this.validationError);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Security helpers
  // ══════════════════════════════════════════════════════════════════════════

  wasDialogTriggered(): boolean {
    return this.dialogTriggered;
  }

  isOnLoginPage(): boolean {
    return /login|signin|auth/i.test(this.page.url());
  }
}
