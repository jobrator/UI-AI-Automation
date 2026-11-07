import { Locator, Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminPsychometricTestPage — Page Object for the Admin Psychometric Test management page.
 * URL: admin.jobrator.com/psychometric-test
 */
export class AdminPsychometricTestPage extends BasePage {
  // ── Exam cards / list ─────────────────────────────────────────────────────
  private readonly examCards =
    '[class*="card"], [class*="exam"], [class*="test"], .card, .exam-item, table tbody tr';

  private readonly titleText =
    '[class*="title"], h3, h4, .card-title, [class*="exam-title"]';

  private readonly statusBadge =
    '[class*="badge"], [class*="status"], .badge, span[class*="active"], span:has-text("Active")';

  // ── Buttons ───────────────────────────────────────────────────────────────
  private readonly createButton =
    'button:has-text("Create"), button:has-text("Add"), a:has-text("Create"), a:has-text("New Exam"), a:has-text("Add New"), a[href*="new"]';

  private readonly editButton =
    'button:has-text("Edit"), a:has-text("Edit"), [title="Edit"], .btn-edit';

  private readonly deleteButton =
    'button:has-text("Delete"), a:has-text("Delete"), [title="Delete"], .btn-delete';

  private readonly viewButton =
    'button:has-text("View"), a:has-text("View"), [title="View"], .btn-view';

  private readonly confirmDeleteBtn =
    'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete"), .modal button:has-text("OK"), [class*="confirm"]';

  private readonly saveButton =
    'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), input[type="submit"]';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}psychometric-test`);
    await this.waitForExamsLoaded();
  }

  /**
   * The page mounts a full-screen loading spinner while the SPA hydrates and
   * the exam list is fetched. The spinner is a generic element (no "Loading
   * exams" text), so waiting only on that text resolves immediately and leaves
   * assertions racing an empty page. First wait for the page shell to render
   * (the "Psychometric Exams" heading or the Create button — present even when
   * zero exams exist), then clear any textual placeholder. If the backend is
   * unavailable the shell never renders — we time out and let callers
   * soft-handle it.
   */
  async waitForExamsLoaded(timeoutMs = 15000): Promise<void> {
    await this.page
      .waitForSelector(
        'h1:has-text("Psychometric"), h3:has-text("Psychometric"), button:has-text("Create"), a:has-text("Create")',
        { state: 'visible', timeout: timeoutMs }
      )
      .catch(() => {});
    await this.page
      .getByText('Loading exams', { exact: false })
      .waitFor({ state: 'hidden', timeout: timeoutMs })
      .catch(() => {});
    await this.page.waitForTimeout(800);
  }

  async isLoaded(): Promise<boolean> {
    const hasCards = await this.lib.isVisible(this.examCards);
    if (hasCards) return true;
    // Soft: if any page content is visible, consider loaded (no exams may exist)
    return this.lib.isVisible('main, .container, nav, h1, h2, h3, button, a');
  }

  // ── State queries ─────────────────────────────────────────────────────────

  async getExamCount(): Promise<number> {
    return this.lib.getCount(this.examCards);
  }

  async hasTitleText(): Promise<boolean> {
    return this.lib.isVisible(this.titleText);
  }

  async hasStatusBadge(): Promise<boolean> {
    return this.lib.isVisible(this.statusBadge);
  }

  async hasActionButtons(): Promise<boolean> {
    const hasEdit = await this.lib.isVisible(this.editButton);
    const hasDelete = await this.lib.isVisible(this.deleteButton);
    const hasView = await this.lib.isVisible(this.viewButton);
    return hasEdit || hasDelete || hasView;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async clickCreateNew(): Promise<void> {
    const exists = await this.lib.isVisible(this.createButton);
    if (!exists) {
      console.warn('[AdminPsychometric] Create button not found');
      return;
    }
    await this.lib.click(this.createButton);
    await this.page.waitForTimeout(800);
  }

  async fillExamDetails(title: string, question: string, answers: string[]): Promise<void> {
    const titleField = 'input[name="title"], input[placeholder*="title" i], input[placeholder*="exam" i]';
    const questionField = 'input[name="question"], textarea[name="question"], input[placeholder*="question" i]';
    const answerField = 'input[name*="answer"], input[placeholder*="answer" i], input[class*="answer"]';

    if (await this.lib.isVisible(titleField)) {
      await this.lib.clearAndFill(titleField, title);
    }
    if (await this.lib.isVisible(questionField)) {
      await this.lib.clearAndFill(questionField, question);
    }
    // Fill answers
    const answerInputs = this.page.locator(answerField);
    const answerCount = await answerInputs.count();
    for (let i = 0; i < Math.min(answers.length, answerCount); i++) {
      await answerInputs.nth(i).clear();
      await answerInputs.nth(i).fill(answers[i]);
    }
  }

  async saveExam(): Promise<void> {
    const btn = this.page.locator(this.saveButton).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1500);
    } else {
      console.warn('[AdminPsychometric] Save button not found — form may not be open or changes auto-saved.');
    }
  }

  // ── Exact, title-scoped helpers (verified against the live admin, 2026-11-05) ──
  // Each exam renders as div.job-card holding its title, "ID: n" and View / Edit /
  // Delete buttons. Delete raises two NATIVE dialogs: confirm("Are you sure you want
  // to delete this exam?") then alert("Exam deleted successfully!").

  /** The card for one exam, matched on its full, unique title. */
  examCard(title: string): Locator {
    return this.page.locator('div.job-card').filter({ hasText: title });
  }

  /** Creates an exam from the first question library that actually holds questions. */
  async createExam(title: string, description: string): Promise<void> {
    await this.page.locator('button:has-text("Create New Exam")').first().click();
    await this.page.locator('input[placeholder="e.g., Software Engineer Assessment"]').first().waitFor({ timeout: 15000 });
    await this.page.locator('input[placeholder="e.g., Software Engineer Assessment"]').first().fill(title);
    await this.page.locator('textarea[placeholder="Description (optional)"]').first().fill(description);
    await this.page.locator('input[placeholder="Duration in minutes"]').first().fill('30');
    const select = this.page.locator('select.form-control').first();
    // The library options are fetched after the form opens; wait for a real one.
    await select.locator('option', { hasText: /\(\d+\s+questions\)/ }).first()
      .waitFor({ state: 'attached', timeout: 20000 }).catch(() => {});
    const options = await select.locator('option').evaluateAll((els) =>
      els.map((e) => ({ v: (e as HTMLOptionElement).value, t: (e.textContent || '').trim() })));
    const library = options.find((o) => o.v && Number(o.t.match(/\((\d+)\s+questions\)/)?.[1] ?? '0') > 0);
    if (!library) throw new Error('No psychometric question library with questions is available to build an exam from.');
    await select.selectOption(library.v);
    await this.page.locator('button:has-text("Create Exam")').first().click();
    await this.page.waitForTimeout(4000);
  }

  /**
   * Deletes exactly the exam with this title, accepting its native confirm.
   * Returns the dialog messages seen, so callers can assert the confirmation was asked.
   */
  async deleteExamByTitle(title: string): Promise<string[]> {
    const card = this.examCard(title);
    const matches = await card.count();
    if (matches !== 1) throw new Error(`Expected exactly one exam titled "${title}", found ${matches}.`);
    const dialogs: string[] = [];
    const onDialog = async (d: import('playwright').Dialog) => { dialogs.push(d.message()); await d.accept(); };
    this.page.on('dialog', onDialog);
    try {
      await card.locator('button:has-text("Delete")').click();
      await this.page.waitForTimeout(4000);
    } finally {
      this.page.off('dialog', onDialog);
    }
    return dialogs;
  }

  async clickEdit(index = 0): Promise<void> {
    const buttons = this.page.locator(this.editButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminPsychometric] No edit buttons found');
      return;
    }
    await buttons.nth(index).click();
    await this.page.waitForTimeout(800);
  }

  async clickDelete(index = 0): Promise<void> {
    const buttons = this.page.locator(this.deleteButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminPsychometric] No delete buttons found');
      return;
    }
    await buttons.nth(index).click();
    await this.page.waitForTimeout(500);
  }

  async confirmDelete(): Promise<void> {
    this.page.once('dialog', async (dialog) => { await dialog.accept(); });
    await this.page.waitForTimeout(300);
    const exists = await this.lib.isVisible(this.confirmDeleteBtn);
    if (exists) {
      await this.lib.click(this.confirmDeleteBtn);
    }
    await this.page.waitForTimeout(3000);
  }

  async modifyExamDetails(): Promise<void> {
    const titleField = 'input[name="title"], input[placeholder*="title" i]';
    if (await this.lib.isVisible(titleField)) {
      const current = await this.lib.getInputValue(titleField).catch(() => 'Exam');
      await this.lib.clearAndFill(titleField, `${current} (updated)`);
    }
  }
}
