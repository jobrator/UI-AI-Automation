import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminSkillsPage — Page Object for the Admin Skills management page.
 * URL: admin.jobrator.com/skills
 */
export class AdminSkillsPage extends BasePage {
  // ── Table ─────────────────────────────────────────────────────────────────
  private readonly skillsTable =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  // ── Controls ──────────────────────────────────────────────────────────────
  private readonly addButton =
    'a[href*="/actions/skills/new"], a[href*="skills/new"], ' +
    'button:has-text("Add"), a:has-text("Add New"), a:has-text("New Skill"), ' +
    'button:has-text("New"), button:has-text("Create"), [class*="btn-add"]';

  private readonly skillNameInput =
    'input[name="name"], input[placeholder*="skill" i], input[placeholder*="name" i], input[type="text"]';

  private readonly saveButton =
    'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), input[type="submit"]';

  private readonly editButton =
    'button:has-text("Edit"), a:has-text("Edit"), [title="Edit"], .btn-edit';

  private readonly deleteButton =
    'button:has-text("Delete"), a:has-text("Delete"), [title="Delete"], .btn-delete';

  // ── Dialogs ───────────────────────────────────────────────────────────────
  private readonly confirmDeleteBtn =
    'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete"), .modal button:has-text("OK"), [class*="confirm"]';

  // Store the last unique skill name created
  public lastCreatedSkillName = '';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}skills`);
    await this.page.waitForTimeout(3000);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector("table, tr, [class*=\"table\"], [class*=\"skills\"], [class*=\"list\"]", { timeout: 8000 }).catch(() => {});
    return this.lib.isVisible(this.skillsTable);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async clickAddButton(): Promise<void> {
    await this.lib.click(this.addButton);
    await this.page.waitForTimeout(500);
  }

  async enterSkillName(name: string): Promise<void> {
    this.lastCreatedSkillName = name;
    // The create/edit form has text inputs with no name attributes.
    // Skip the global search bar (placeholder="Type to search...") and use the last remaining text input.
    const inputs = this.page.locator('input[type="text"]:not([placeholder="Type to search..."])');
    const count = await inputs.count();
    if (count > 0) {
      const nameInput = inputs.nth(count > 1 ? count - 1 : 0);
      await nameInput.clear();
      await nameInput.fill(name);
    } else {
      await this.lib.clearAndFill(this.skillNameInput, name);
    }
  }

  async clickSave(): Promise<void> {
    const btn = this.page.locator(this.saveButton).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(3000);
    } else {
      console.warn('[AdminSkills] Save button not found — form may not be open or changes auto-saved.');
    }
  }

  async addSkill(name: string): Promise<void> {
    await this.clickAddButton();
    await this.enterSkillName(name);
    await this.clickSave();
  }

  async editFirstSkill(newName: string): Promise<void> {
    const buttons = this.page.locator(this.editButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminSkills] No edit button found');
      return;
    }
    await buttons.first().click();
    await this.page.waitForTimeout(500);
    this.lastCreatedSkillName = newName;
    if (await this.lib.isVisible(this.skillNameInput)) {
      await this.lib.clearAndFill(this.skillNameInput, newName);
    }
    await this.clickSave();
  }

  async deleteSkill(index = 0): Promise<void> {
    const buttons = this.page.locator(this.deleteButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminSkills] No delete button found');
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

  // ── State queries ─────────────────────────────────────────────────────────

  async getSkillCount(): Promise<number> {
    return this.lib.getCount(this.tableRows);
  }

  async isSkillVisible(name: string): Promise<boolean> {
    return this.lib.isVisible(`td:has-text("${name}"), li:has-text("${name}")`);
  }
}
