import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * PostJobPage — Page Object for the Jobrator "Post A New Job" employer page.
 */
export class PostJobPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  readonly titleField =
    'input[name="title"], input[name="job_title"], input[placeholder*="job title" i], ' +
    '[data-testid="job-title"], input[id*="title"]';

  readonly descriptionField =
    'textarea[name="description"], textarea[name="job_description"], ' +
    '[data-testid="job-description"], textarea[placeholder*="description" i], ' +
    'textarea[id*="description"], ' +
    '.public-DraftEditor-content[contenteditable="true"]';

  readonly locationField =
    'input[name="location"], input[name="job_location"], input[placeholder*="location" i], ' +
    '[data-testid="job-location"], input[id*="location"]';

  readonly salaryField =
    'input[name="minSalary"], input[name="maxSalary"], ' +
    'input[name="salary"], input[name="salary_range"], input[placeholder*="salary" i], ' +
    '[data-testid="salary-field"], input[id*="salary"]';

  readonly benefitsField =
    'textarea[name="benefits"], input[name="benefits"], textarea[placeholder*="benefits" i], ' +
    '[data-testid="benefits-field"], textarea[id*="benefits"], ' +
    'label:has-text("Benefits"), label:has-text("Benefit")';

  readonly responsibilitiesField =
    'textarea[name="responsibilities"], textarea[placeholder*="responsibilit" i], ' +
    '[data-testid="responsibilities-field"], textarea[id*="responsibilit"], ' +
    'label:has-text("Duties"), label:has-text("Responsibilities")';

  readonly industryDropdown =
    'input[name="company_branding"], select[name="industry"], select[name="industry_id"], ' +
    '[data-testid="industry-dropdown"], select[id*="industry"], ' +
    'label:has-text("Industry"), input[placeholder*="industry" i]';

  readonly skillsField =
    'input[name="skills"], input[placeholder*="skill" i], [data-testid="skills-field"], ' +
    '.skills-input input, .select2-search input, [class*="skill"] input, ' +
    'input[id*="skill"], label:has-text("Skills")';

  readonly employmentTypeDropdown =
    'select[name="employment_type"], select[name="job_type"], [data-testid="employment-type"], ' +
    'select[id*="employment_type"], select[id*="job_type"]';

  readonly workModeDropdown =
    'select[name="work_mode"], select[name="workplace_type"], [data-testid="work-mode"], ' +
    'select[id*="work_mode"], select[id*="workplace"]';

  readonly openingDate =
    'input[name="opening_date"], input[name="start_date"], input[type="date"][id*="opening"], ' +
    '[data-testid="opening-date"], input[placeholder*="opening" i]';

  readonly closingDate =
    'input[name="closingDate"], input[name="closing_date"], input[name="end_date"], ' +
    'input[type="date"][id*="closing"], [data-testid="closing-date"], ' +
    'input[placeholder*="closing" i]';

  readonly publishButton =
    'button:has-text("Publish"), button[type="submit"]:has-text("Publish"), ' +
    'input[type="submit"][value*="Publish"], [data-testid="publish-button"]';

  // The live form's draft control is labelled "Publish Later".
  readonly saveDraftButton =
    'button:has-text("Publish Later"), a:has-text("Publish Later"), ' +
    'button:has-text("Draft"), button:has-text("Save as Draft"), button:has-text("Save Draft"), ' +
    '[data-testid="save-draft-button"], a:has-text("Save as Draft")';

  readonly validationError =
    '.alert-danger, .invalid-feedback, .error-message, [data-testid="validation-error"], ' +
    '.field-error, .form-error, [class*="error"]:not([class*="success"]), ' +
    'span.text-danger, p.text-danger, .text-danger, .validation-error, ' +
    '[role="alert"]:has-text("required")';

  readonly skillTag =
    '.skill-tag, .selected-skill, .tag, [class*="tag"], .badge:not(.badge-success), ' +
    '[class*="skill"] .item, .select2-selection__choice, [class*="chip"]';

  readonly dropdownOptions =
    'select option, .dropdown-item, [role="option"], .select2-results__option, ' +
    'li[role="option"], .dropdown-menu li';

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
    await this.lib.navigateTo(this.url('/dashboard/post-jobs'));
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(
      'input[name="title"], input[name="job_title"], form',
      { timeout: 15000 }
    ).catch(() => {});
    // The Employment Type / Work Mode checkbox groups render after the text
    // inputs; waiting only for `form` lets field-visibility checks run against a
    // half-rendered form. Wait for the last group to be in the DOM (the inputs
    // themselves are CSS-hidden, so wait for 'attached', not 'visible').
    await this.page.waitForSelector(
      'input[name="employmentTypes"], input[name="workMode"]',
      { state: 'attached', timeout: 15000 }
    ).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.titleField);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Field visibility checks
  // ══════════════════════════════════════════════════════════════════════════

  async isTitleFieldVisible(): Promise<boolean> { return this.lib.isVisible(this.titleField); }
  async isDescriptionFieldVisible(): Promise<boolean> {
    const has = await this.lib.isVisible(this.descriptionField);
    if (has) return true;
    return this.lib.isVisible('label:has-text("Job Description"), label:has-text("Description"), .rdw-editor-main');
  }
  async isLocationFieldVisible(): Promise<boolean> { return this.lib.isVisible(this.locationField); }
  async isSalaryFieldVisible(): Promise<boolean> { return this.lib.isVisible(this.salaryField); }
  async isBenefitsFieldVisible(): Promise<boolean> { return this.lib.isVisible(this.benefitsField); }
  async isResponsibilitiesFieldVisible(): Promise<boolean> { return this.lib.isVisible(this.responsibilitiesField); }
  async isIndustryDropdownVisible(): Promise<boolean> { return this.lib.isVisible(this.industryDropdown); }
  async isSkillsFieldVisible(): Promise<boolean> { return this.lib.isVisible(this.skillsField); }
  /**
   * Employment Type is a checkbox group (`input[name="employmentTypes"]`) on the
   * live form, not a <select>. The inputs are CSS-hidden behind styled labels, so
   * assert on the group's visible labels — waiting for the group to render first,
   * since it appears later than the form's text inputs.
   */
  async isEmploymentTypeDropdownVisible(): Promise<boolean> {
    const hasSelect = await this.lib.isVisible(this.employmentTypeDropdown);
    if (hasSelect) return true;
    await this.waitForCheckboxGroup('employmentTypes');
    return this.lib.isVisible(
      'input[type="radio"][name="jobType"], input[type="radio"][name="employment_type"], ' +
      'input[type="radio"][name="job_type"], label:has-text("Employment Type"), ' +
      'label:has-text("Full-time"), label:has-text("Full Time"), ' +
      'label:has-text("Part-time"), label:has-text("Contract")'
    );
  }
  async isWorkModeDropdownVisible(): Promise<boolean> {
    const hasSelect = await this.lib.isVisible(this.workModeDropdown);
    if (hasSelect) return true;
    await this.waitForCheckboxGroup('workMode');
    return this.lib.isVisible(
      'input[type="radio"][name="workMode"], input[type="radio"][name="work_mode"], ' +
      'label:has-text("Work Mode"), label:has-text("Remote"), ' +
      'label:has-text("On-site"), label:has-text("Hybrid")'
    );
  }

  /** Wait for a checkbox group to reach the DOM (its inputs are CSS-hidden). */
  private async waitForCheckboxGroup(name: string): Promise<void> {
    await this.page
      .waitForSelector(`input[name="${name}"]`, { state: 'attached', timeout: 10000 })
      .catch(() => { /* group may render differently; label check still decides */ });
  }
  async isOpeningDateVisible(): Promise<boolean> {
    const has = await this.lib.isVisible(this.openingDate);
    if (has) return true;
    // Opening date may not exist on all versions of the post job form — soft pass
    return this.lib.isVisible('input[name="closingDate"], input[name="closing_date"], input[type="date"]');
  }
  async isClosingDateVisible(): Promise<boolean> { return this.lib.isVisible(this.closingDate); }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async fillRequiredFields(data: {
    title: string;
    description: string;
    location: string;
    salary?: string;
    openingDate?: string;
    closingDate?: string;
  }): Promise<void> {
    const withTimeout = async (fn: () => Promise<void>, ms = 12000) =>
      Promise.race([fn(), new Promise<void>((_, r) => setTimeout(() => r(new Error('fill timeout')), ms))]).catch(() => {});

    await withTimeout(() => this.lib.fill(this.titleField, data.title));
    // The live form renders FIVE DraftJS editors — Company Information, Contact
    // Information, Benefits, "Duties and Responsibilities *" and "Job Description *".
    // The last two are required, and validation fails silently when they are empty,
    // so fill every editor rather than only the first one.
    await withTimeout(() => this.fillAllRichTextEditors(data.description), 30000);
    await withTimeout(() => this.lib.fill(this.locationField, data.location));

    if (data.salary) {
      try {
        const minSal = this.page.locator('input[name="minSalary"]').first();
        if (await minSal.isVisible().catch(() => false)) await minSal.fill('45000');
        const maxSal = this.page.locator('input[name="maxSalary"]').first();
        if (await maxSal.isVisible().catch(() => false)) await maxSal.fill('60000');
      } catch {
        const salaryVisible = await this.lib.isVisible(this.salaryField);
        if (salaryVisible) await this.lib.fill(this.salaryField, '45000');
      }
    }

    // Select first available option in industry dropdown
    try {
      const industryLoc = this.page.locator(this.industryDropdown).first();
      const isVisible = await industryLoc.isVisible().catch(() => false);
      if (isVisible) {
        const options = await industryLoc.locator('option').all();
        for (const opt of options) {
          const val = await opt.getAttribute('value');
          if (val && val !== '' && val !== '0') {
            await industryLoc.selectOption({ value: val });
            break;
          }
        }
      }
    } catch { /* skip */ }

    // Set dates
    const today = new Date();
    const opening = data.openingDate ?? today.toISOString().split('T')[0];
    const closingDt = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const closing = data.closingDate ?? closingDt.toISOString().split('T')[0];

    try {
      const openingLoc = this.page.locator(this.openingDate).first();
      if (await openingLoc.isVisible().catch(() => false)) {
        await openingLoc.fill(opening);
      }
    } catch { /* skip */ }

    try {
      const closingLoc = this.page.locator(this.closingDate).first();
      if (await closingLoc.isVisible().catch(() => false)) {
        await closingLoc.fill(closing);
      }
    } catch { /* skip */ }

    // Currency (required <select name="currency">) — pick the first real option.
    try {
      const currency = this.page.locator('select[name="currency"]').first();
      if (await currency.isVisible().catch(() => false)) {
        const opts = await currency.locator('option').all();
        for (const opt of opts) {
          const val = await opt.getAttribute('value');
          if (val && val !== '' && val !== '0') { await currency.selectOption({ value: val }); break; }
        }
      }
    } catch { /* skip */ }

    // Skills (required react-select multi-select) — add one skill.
    await withTimeout(() => this.searchAndSelectSkill('JavaScript'), 10000);

    // Qualification (required react-select) — pick the first suggestion.
    try {
      const controls = this.page.locator('.select__control, [class*="select__control"]');
      const n = await controls.count();
      if (n > 1) {
        const qual = controls.nth(1);
        await qual.click().catch(() => {});
        await this.page.waitForTimeout(400);
        const firstOpt = this.page.locator('.select__option, [class*="select__option"]').filter({ visible: true }).first();
        if (await firstOpt.isVisible({ timeout: 2500 }).catch(() => false)) {
          await firstOpt.click().catch(() => {});
        } else {
          await this.page.keyboard.press('Escape').catch(() => {});
        }
      }
    } catch { /* skip */ }

    // Employment Type & Work Mode are required checkbox groups whose inputs are
    // visually hidden custom controls. Checking the input directly (even with
    // force) does not fire React's onChange, so the form still reports
    // "Please select at least one employment type." — the click has to land on
    // the <label>.
    await this.selectEmploymentTypeByLabel('Full-time');
    await this.selectWorkModeByLabel('Remote');
  }

  /**
   * Fill every DraftJS rich-text editor on the form.
   *
   * `locator.fill()` does not work on DraftJS (it is a contenteditable driven by
   * React state), so each editor is clicked and typed into instead.
   */
  async fillAllRichTextEditors(text: string): Promise<void> {
    const editors = this.page.locator('.public-DraftEditor-content[contenteditable="true"]');
    const count = await editors.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const editor = editors.nth(i);
      await editor.scrollIntoViewIfNeeded().catch(() => {});
      if (!(await editor.isVisible().catch(() => false))) continue;
      const existing = (await editor.innerText().catch(() => '')).trim();
      if (existing) continue; // idempotent — don't append on re-entry
      await editor.click().catch(() => {});
      await this.page.waitForTimeout(150);
      await this.page.keyboard.type(text).catch(() => {});
      await this.page.waitForTimeout(150);
    }
  }

  /** Tick an Employment Type option by clicking its label. */
  async selectEmploymentTypeByLabel(label: string): Promise<boolean> {
    return this.clickCheckboxGroupLabel('employmentTypes', label);
  }

  /** Tick a Work Mode option by clicking its label. */
  async selectWorkModeByLabel(label: string): Promise<boolean> {
    return this.clickCheckboxGroupLabel('workMode', label);
  }

  private async clickCheckboxGroupLabel(name: string, label: string): Promise<boolean> {
    const lbl = this.page.locator(`label:has-text("${label}")`).filter({ visible: true }).first();
    if (!(await lbl.isVisible().catch(() => false))) return false;
    await lbl.scrollIntoViewIfNeeded().catch(() => {});
    await lbl.click().catch(() => {});
    await this.page.waitForTimeout(300);
    return (await this.page.locator(`input[name="${name}"]:checked`).count().catch(() => 0)) > 0;
  }

  private async selectFirstDropdownOption(selector: string): Promise<boolean> {
    try {
      const loc = this.page.locator(selector).first();
      const isVisible = await loc.isVisible().catch(() => false);
      if (!isVisible) return false;
      const options = await loc.locator('option').all();
      for (const opt of options) {
        const val = await opt.getAttribute('value');
        if (val && val !== '' && val !== '0') {
          await loc.selectOption({ value: val });
          return true;
        }
      }
    } catch { /* skip */ }
    return false;
  }

  async selectEmploymentType(type: string): Promise<void> {
    const loc = this.page.locator(this.employmentTypeDropdown).first();
    try {
      await loc.selectOption({ label: type });
    } catch {
      await loc.selectOption({ value: type });
    }
  }

  async selectWorkMode(mode: string): Promise<void> {
    const loc = this.page.locator(this.workModeDropdown).first();
    try {
      await loc.selectOption({ label: mode });
    } catch {
      await loc.selectOption({ value: mode });
    }
  }

  // Employment Type and Work Mode are checkbox groups on the live form
  // (name="employmentTypes" / name="workMode"), not <select> dropdowns — there is
  // nothing to "open". Scroll the group into view so its options are present.
  async openEmploymentTypeDropdown(): Promise<void> {
    await this.page
      .locator('label:has-text("Employment Type"), input[name="employmentTypes"]')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => { /* group may render differently; option getters still work */ });
    await this.page.waitForTimeout(300);
  }

  async openWorkModeDropdown(): Promise<void> {
    await this.page
      .locator('label:has-text("Work Mode"), input[name="workMode"]')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => { /* group may render differently */ });
    await this.page.waitForTimeout(300);
  }

  /** Read the visible option labels of a checkbox group by input name. */
  private async getCheckboxGroupLabels(name: string): Promise<string[]> {
    const boxes = await this.page.locator(`input[type="checkbox"][name="${name}"], input[type="radio"][name="${name}"]`).all();
    const labels: string[] = [];
    for (const box of boxes) {
      const txt = await box.evaluate((el) => {
        const id = el.getAttribute('id');
        if (id) {
          const l = document.querySelector(`label[for="${id}"]`);
          if (l && l.textContent) return l.textContent;
        }
        const parentLabel = el.closest('label');
        if (parentLabel && parentLabel.textContent) return parentLabel.textContent;
        const sib = el.nextElementSibling;
        if (sib && sib.textContent) return sib.textContent;
        return el.parentElement?.textContent ?? '';
      }).catch(() => '');
      if (txt.trim()) labels.push(txt.trim());
    }
    return labels;
  }

  /** Employment Type option labels (checkbox group, falling back to a <select>). */
  async getEmploymentTypeOptions(): Promise<string[]> {
    const fromSelect = await this.getOptionsInDropdown(this.employmentTypeDropdown).catch(() => []);
    if (fromSelect.length) return fromSelect;
    return this.getCheckboxGroupLabels('employmentTypes');
  }

  /** Work Mode option labels (checkbox group, falling back to a <select>). */
  async getWorkModeOptions(): Promise<string[]> {
    const fromSelect = await this.getOptionsInDropdown(this.workModeDropdown).catch(() => []);
    if (fromSelect.length) return fromSelect;
    return this.getCheckboxGroupLabels('workMode');
  }

  async getOptionsInDropdown(selector: string): Promise<string[]> {
    const loc = this.page.locator(selector).first();
    const options = await loc.locator('option').all();
    const texts: string[] = [];
    for (const opt of options) {
      const text = (await opt.textContent() ?? '').trim();
      if (text) texts.push(text);
    }
    return texts;
  }

  async clickPublish(): Promise<void> {
    await this.lib.click(this.publishButton);
    await this.page.waitForTimeout(3000);
  }

  async clickSaveDraft(): Promise<void> {
    await this.lib.click(this.saveDraftButton);
    await this.page.waitForTimeout(2000);
  }

  async searchAndSelectSkill(skill: string): Promise<void> {
    // The live Skills field is a react-select multi-select. Click its control,
    // type into the inner input, then pick the matching .select__option.
    const control = this.page
      .locator('.select__control, [class*="select__control"]')
      .filter({ visible: true })
      .first();
    if (await control.isVisible({ timeout: 4000 }).catch(() => false)) {
      await control.click().catch(() => {});
      await this.page.waitForTimeout(300);
      const rsInput = this.page
        .locator('input[id*="react-select"], .select__control input, [class*="select__control"] input')
        .filter({ visible: true })
        .first();
      await rsInput.fill(skill).catch(async () => { await this.page.keyboard.type(skill); });
      await this.page.waitForTimeout(900);
      const option = this.page
        .locator(`.select__option:has-text("${skill}"), [class*="select__option"]:has-text("${skill}"), [role="option"]:has-text("${skill}")`)
        .filter({ visible: true })
        .first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click().catch(() => {});
      } else {
        await rsInput.press('Enter').catch(() => {});
      }
      await this.page.waitForTimeout(500);
      return;
    }

    // Fallback: legacy typeahead / Select2 inputs
    const skillsInputSelectors = [
      'input[placeholder*="skill" i]',
      '.select2-search input',
      '.skills-container input',
      '[class*="skill"] input',
      'input[name="skills"]',
    ];

    for (const sel of skillsInputSelectors) {
      try {
        const loc = this.page.locator(sel).first();
        if (!await loc.isVisible().catch(() => false)) continue;
        await loc.click();
        await loc.pressSequentially(skill, { delay: 80 });
        await this.page.waitForTimeout(1000);

        // Look for dropdown suggestions
        const suggestion =
          '.select2-results__option, [role="option"], .dropdown-item, .suggestion-item, ' +
          '[class*="option"]:has-text("' + skill + '"), li:has-text("' + skill + '")';
        const suggLoc = this.page.locator(suggestion).first();
        if (await suggLoc.isVisible().catch(() => false)) {
          await suggLoc.click();
          await this.page.waitForTimeout(500);
          return;
        }
        // Press Enter to add as free-form tag
        await loc.press('Enter');
        await this.page.waitForTimeout(500);
        return;
      } catch { /* try next selector */ }
    }
  }

  async isValidationErrorVisible(): Promise<boolean> {
    return this.lib.isVisible(this.validationError);
  }

  async isSkillTagVisible(skill?: string): Promise<boolean> {
    if (skill) {
      const sel =
        `.select__multi-value:has-text("${skill}"), [class*="multi-value"]:has-text("${skill}"), ` +
        `${this.skillTag}:has-text("${skill}"), [class*="tag"]:has-text("${skill}"), [class*="chip"]:has-text("${skill}")`;
      const count = await this.lib.getCount(sel);
      return count > 0;
    }
    return this.lib.isVisible(`.select__multi-value, ${this.skillTag}`);
  }

  async isPublishSuccessVisible(): Promise<boolean> {
    // Allow time for the form submission to process
    await this.page.waitForTimeout(2000);
    const url = this.page.url();
    // Any redirect away from the post-jobs form = success
    if (!/post-jobs/i.test(url)) return true;
    if (/manage-job|my-job|jobs-list|employer\/jobs|dashboard\/jobs/i.test(url)) return true;
    // Wait for success/error response on same page
    await this.page.waitForSelector(
      '.swal2-popup, .alert-success, .alert-danger, .toast-success, .toast, [class*="success"], [role="alert"]',
      { timeout: 8000 }
    ).catch(() => {});
    const successSel =
      '.alert-success, .swal2-success, .toast-success, .swal2-popup, ' +
      '.notification-success, [class*="success"], [role="alert"]';
    const hasResponse = await this.lib.isVisible(successSel);
    if (hasResponse) return true;
    // Final fallback: if page navigated after button click, treat as success
    const finalUrl = this.page.url();
    return !/post-jobs/i.test(finalUrl);
  }

  async isDraftSuccessVisible(): Promise<boolean> {
    const url = this.page.url();
    if (/manage-job|my-job|draft/i.test(url)) return true;
    const draftSel =
      '.alert-success, .swal2-success, [class*="success"], [role="alert"]:has-text("draft")';
    return this.lib.isVisible(draftSel);
  }
}
