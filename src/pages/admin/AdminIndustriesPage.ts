import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminIndustriesPage — Page Object for the Admin Industries management page.
 * URL: admin.jobrator.com/industries
 */
export class AdminIndustriesPage extends BasePage {
  private readonly industriesTable =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  private readonly addButton =
    'button:has-text("Add"), button:has-text("New"), a:has-text("Add"), a:has-text("New Industry"), button:has-text("Create")';

  private readonly nameInput =
    'input[name="name"], input[placeholder*="industry" i], input[placeholder*="name" i], input[type="text"]';

  private readonly saveButton =
    'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), input[type="submit"]';

  private readonly editButton =
    'button:has-text("Edit"), a:has-text("Edit"), [title="Edit"], .btn-edit';

  private readonly deleteButton =
    'button:has-text("Delete"), a:has-text("Delete"), [title="Delete"], .btn-delete';

  private readonly confirmDeleteBtn =
    'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete"), .modal button:has-text("OK"), [class*="confirm"]';

  public lastCreatedIndustryName = '';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}industries`);
    await this.page.waitForTimeout(3000);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector("table, tr, [class*=\"table\"], [class*=\"skills\"], [class*=\"list\"]", { timeout: 8000 }).catch(() => {});
    return this.lib.isVisible(this.industriesTable);
  }

  async addIndustry(name: string): Promise<void> {
    this.lastCreatedIndustryName = name;
    const addExists = await this.lib.isVisible(this.addButton);
    if (addExists) {
      await this.lib.click(this.addButton);
      await this.page.waitForTimeout(500);
    }
    if (await this.lib.isVisible(this.nameInput)) {
      await this.lib.clearAndFill(this.nameInput, name);
    }
    const addSaveBtn = this.page.locator(this.saveButton).first();
    if (await addSaveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addSaveBtn.click();
      await this.page.waitForTimeout(3000);
    } else {
      console.warn('[AdminIndustries] Save button not found after add — form may not have opened.');
    }
  }

  async editFirstIndustry(newName: string): Promise<void> {
    const buttons = this.page.locator(this.editButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminIndustries] No edit button found');
      return;
    }
    this.lastCreatedIndustryName = newName;
    await buttons.first().click();
    await this.page.waitForTimeout(500);
    if (await this.lib.isVisible(this.nameInput)) {
      await this.lib.clearAndFill(this.nameInput, newName);
    }
    const editSaveBtn = this.page.locator(this.saveButton).first();
    if (await editSaveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editSaveBtn.click();
      await this.page.waitForTimeout(3000);
    } else {
      console.warn('[AdminIndustries] Save button not found after edit — form may not have opened.');
    }
  }

  async deleteIndustry(index = 0): Promise<void> {
    const buttons = this.page.locator(this.deleteButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminIndustries] No delete button found');
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

  async isIndustryVisible(name: string): Promise<boolean> {
    return this.lib.isVisible(`td:has-text("${name}"), li:has-text("${name}")`);
  }

  async getRowCount(): Promise<number> {
    return this.lib.getCount(this.tableRows);
  }
}
