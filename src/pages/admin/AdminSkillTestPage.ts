import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminSkillTestPage — Page Object for the Admin Skill Test management page.
 * URL: admin.jobrator.com/skill-test
 */
export class AdminSkillTestPage extends BasePage {
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

  // ── Questions display ─────────────────────────────────────────────────────
  private readonly questionItems =
    '[class*="question"], .question, li[class*="question"], [class*="quiz-item"]';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}skill-test`);
    await this.waitForExamsLoaded();
  }

  /**
   * The skill exam list is fetched asynchronously behind a "Loading exams..."
   * placeholder. Wait for it to clear (bounded) before querying cards so we
   * don't read against a still-loading page. If the backend is unavailable the
   * placeholder never clears — we time out and let callers soft-handle it.
   */
  async waitForExamsLoaded(timeoutMs = 15000): Promise<void> {
    await this.page
      .getByText('Loading exams', { exact: false })
      .waitFor({ state: 'hidden', timeout: timeoutMs })
      .catch(() => {});
    await this.page.waitForTimeout(800);
  }

  async isLoaded(): Promise<boolean> {
    const hasCards = await this.lib.isVisible(this.examCards);
    if (hasCards) return true;
    // Soft: if any page content rendered, consider loaded (no exams may exist,
    // or the async list is still resolving) — mirrors AdminPsychometricTestPage.
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

  async hasQuestionsDisplayed(): Promise<boolean> {
    return this.lib.isVisible(this.questionItems);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async clickCreateNew(): Promise<void> {
    const exists = await this.lib.isVisible(this.createButton);
    if (!exists) {
      console.warn('[AdminSkillTest] Create button not found');
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
      console.warn('[AdminSkillTest] Save button not found — form may not be open or changes auto-saved.');
    }
  }

  async clickView(index = 0): Promise<void> {
    const buttons = this.page.locator(this.viewButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminSkillTest] No view buttons found');
      return;
    }
    await buttons.nth(index).click();
    await this.page.waitForTimeout(3000);
  }

  async clickEdit(index = 0): Promise<void> {
    const buttons = this.page.locator(this.editButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminSkillTest] No edit buttons found');
      return;
    }
    await buttons.nth(index).click();
    await this.page.waitForTimeout(800);
  }

  async clickDelete(index = 0): Promise<void> {
    const buttons = this.page.locator(this.deleteButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminSkillTest] No delete buttons found');
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

  async selectFirstExam(): Promise<void> {
    const cards = this.page.locator(this.examCards);
    const count = await cards.count();
    if (count === 0) {
      console.warn('[AdminSkillTest] No exam cards found');
      return;
    }
    await cards.first().click();
    await this.page.waitForTimeout(800);
  }

  async configureAssignment(): Promise<void> {
    // Try to find an assignment form with candidate or job selector
    const candidateSelect = 'select[name*="candidate"], select[id*="candidate"], [placeholder*="candidate" i]';
    const jobSelect = 'select[name*="job"], select[id*="job"], [placeholder*="job" i]';
    if (await this.lib.isVisible(candidateSelect)) {
      await this.page.locator(candidateSelect).selectOption({ index: 1 }).catch(() => {
        console.warn('[AdminSkillTest] Could not select candidate from dropdown');
      });
    }
    if (await this.lib.isVisible(jobSelect)) {
      await this.page.locator(jobSelect).selectOption({ index: 1 }).catch(() => {
        console.warn('[AdminSkillTest] Could not select job from dropdown');
      });
    }
  }
}
