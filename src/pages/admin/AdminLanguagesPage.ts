import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminLanguagesPage — Page Object for the Admin Languages management page.
 * URL: admin.jobrator.com/languages
 */
export class AdminLanguagesPage extends BasePage {
  private readonly languagesTable =
    'table';

  private readonly tableRows =
    'table tbody tr, [class*="table"] tbody tr';

  private readonly addButton =
    'button:has-text("Add"), button:has-text("New"), a:has-text("Add"), a:has-text("New Language"), button:has-text("Create")';

  private readonly nameInput =
    'input[name="name"], input[placeholder*="language" i], input[placeholder*="name" i], input[type="text"]';

  private readonly saveButton =
    'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), input[type="submit"]';

  public lastCreatedLanguageName = '';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}languages`);
    await this.page.waitForTimeout(3000);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector("table, tr, [class*=\"table\"], [class*=\"skills\"], [class*=\"list\"]", { timeout: 8000 }).catch(() => {});
    return this.lib.isVisible(this.languagesTable);
  }

  async addLanguage(name: string): Promise<void> {
    this.lastCreatedLanguageName = name;
    const addExists = await this.lib.isVisible(this.addButton);
    if (addExists) {
      await this.lib.click(this.addButton);
      await this.page.waitForTimeout(500);
    }
    if (await this.lib.isVisible(this.nameInput)) {
      await this.lib.clearAndFill(this.nameInput, name);
    }
    const saveBtn = this.page.locator(this.saveButton).first();
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveBtn.click();
      await this.page.waitForTimeout(3000);
    } else {
      console.warn('[AdminLanguages] Save button not found — form may not have opened.');
    }
  }

  async isLanguageVisible(name: string): Promise<boolean> {
    return this.lib.isVisible(`td:has-text("${name}"), li:has-text("${name}")`);
  }

  async getRowCount(): Promise<number> {
    return this.lib.getCount(this.tableRows);
  }
}
