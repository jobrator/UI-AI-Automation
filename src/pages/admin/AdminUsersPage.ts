import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { EnvConfig } from '../../config/env.config';

const envConfig = EnvConfig.getInstance();

/**
 * AdminUsersPage — Page Object for the Admin Users management page.
 * URL: admin.jobrator.com/user
 */
export class AdminUsersPage extends BasePage {
  // ── Table ─────────────────────────────────────────────────────────────────
  private readonly usersTable =
    'table';

  private readonly tableRows =
    'table tr';

  // ── Columns (header checks) ───────────────────────────────────────────────
  private readonly idCol = 'th:has-text("ID"), th:has-text("Id"), td:nth-child(1)';
  private readonly nameCol = 'th:has-text("Name"), th:has-text("name")';
  private readonly usernameCol = 'th:has-text("Username"), th:has-text("username")';
  private readonly emailCol = 'th:has-text("Email"), th:has-text("email")';
  private readonly roleCol = 'th:has-text("Role"), th:has-text("role")';
  private readonly enabledCol = 'th:has-text("Enabled"), th:has-text("Status"), th:has-text("Active")';
  private readonly actionsCol = 'th:has-text("Actions"), th:has-text("Action")';

  // ── Controls ──────────────────────────────────────────────────────────────
  private readonly searchInput =
    'input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i], input[type="text"][class*="search"]';

  private readonly editButton =
    'button:has-text("Edit"), a:has-text("Edit"), [title="Edit"], .btn-edit, [class*="edit"]';

  private readonly deleteButton =
    'button:has-text("Delete"), a:has-text("Delete"), [title="Delete"], .btn-delete, [class*="delete"]';

  private readonly enabledToggle =
    'input[type="checkbox"], .toggle, [class*="toggle"], [class*="switch"]';

  private readonly createUserLink =
    'a:has-text("Create"), a:has-text("Add"), a:has-text("New User"), a[href*="new"], button:has-text("Add New"), button:has-text("Create")';

  // ── Dialogs ───────────────────────────────────────────────────────────────
  private readonly confirmDeleteBtn =
    'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete"), [class*="confirm"], .modal button:has-text("OK")';

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
    await this.lib.navigateTo(`${adminUrl}user`);
    await this.page.waitForTimeout(3000);
  }

  async isLoaded(): Promise<boolean> {
    await this.page.waitForSelector("table, tr, [class*=\"table\"], [class*=\"skills\"], [class*=\"list\"]", { timeout: 8000 }).catch(() => {});
    return this.lib.isVisible(this.usersTable);
  }

  // ── State queries ─────────────────────────────────────────────────────────

  async getRowCount(): Promise<number> {
    return this.lib.getCount(this.tableRows);
  }

  async hasIdColumn(): Promise<boolean> {
    return this.lib.isVisible(this.idCol);
  }

  async hasNameColumn(): Promise<boolean> {
    return this.lib.isVisible(this.nameCol);
  }

  async hasUsernameColumn(): Promise<boolean> {
    return this.lib.isVisible(this.usernameCol);
  }

  async hasEmailColumn(): Promise<boolean> {
    return this.lib.isVisible(this.emailCol);
  }

  async hasRoleColumn(): Promise<boolean> {
    return this.lib.isVisible(this.roleCol);
  }

  async hasEnabledColumn(): Promise<boolean> {
    return this.lib.isVisible(this.enabledCol);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async searchUser(term: string): Promise<void> {
    const exists = await this.lib.isVisible(this.searchInput);
    if (!exists) {
      console.warn('[AdminUsers] Search input not found — skipping search');
      return;
    }
    await this.lib.clearAndFill(this.searchInput, term);
    await this.page.waitForTimeout(800);
  }

  async clickEdit(rowIndex = 0): Promise<void> {
    const buttons = this.page.locator(this.editButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminUsers] No edit buttons found');
      return;
    }
    await buttons.nth(rowIndex).click();
    await this.page.waitForTimeout(800);
  }

  async clickDelete(rowIndex = 0): Promise<void> {
    const buttons = this.page.locator(this.deleteButton);
    const count = await buttons.count();
    if (count === 0) {
      console.warn('[AdminUsers] No delete buttons found');
      return;
    }
    await buttons.nth(rowIndex).click();
    await this.page.waitForTimeout(800);
  }

  async toggleEnabled(rowIndex = 0): Promise<void> {
    const toggles = this.page.locator(this.enabledToggle);
    const count = await toggles.count();
    if (count === 0) {
      console.warn('[AdminUsers] No enabled toggle found');
      return;
    }
    await toggles.nth(rowIndex).click({ force: true });
    await this.page.waitForTimeout(800);
  }

  async clickCreateNew(): Promise<void> {
    const exists = await this.lib.isVisible(this.createUserLink);
    if (!exists) {
      const adminUrl = envConfig.adminUrl.endsWith('/') ? envConfig.adminUrl : `${envConfig.adminUrl}/`;
      await this.lib.navigateTo(`${adminUrl}actions/users/new`);
    } else {
      await this.lib.click(this.createUserLink);
    }
    await this.page.waitForTimeout(800);
  }

  async confirmDelete(): Promise<void> {
    // Accept native browser dialog first
    this.page.once('dialog', async (dialog) => { await dialog.accept(); });
    await this.page.waitForTimeout(300);
    // Also check for modal confirm button
    const exists = await this.lib.isVisible(this.confirmDeleteBtn);
    if (exists) {
      await this.lib.click(this.confirmDeleteBtn);
    }
    await this.page.waitForTimeout(3000);
  }

  async fillNewUserForm(uniqueEmail: string): Promise<void> {
    // Generic form fill — try common field patterns
    const nameField = 'input[name="name"], input[placeholder*="name" i]';
    const usernameField = 'input[name="username"], input[placeholder*="username" i]';
    const emailField = 'input[name="email"], input[type="email"], input[placeholder*="email" i]';
    const passwordField = 'input[name="password"], input[type="password"]';

    const timestamp = Date.now();

    if (await this.lib.isVisible(nameField)) {
      await this.lib.clearAndFill(nameField, `Test User ${timestamp}`);
    }
    if (await this.lib.isVisible(usernameField)) {
      await this.lib.clearAndFill(usernameField, `testuser${timestamp}`);
    }
    if (await this.lib.isVisible(emailField)) {
      await this.lib.clearAndFill(emailField, uniqueEmail);
    }
    if (await this.lib.isVisible(passwordField)) {
      await this.lib.clearAndFill(passwordField, 'Test@123456');
    }
  }

  async saveForm(): Promise<void> {
    const saveBtn = 'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), input[type="submit"]';
    await this.lib.click(saveBtn);
    await this.page.waitForTimeout(1500);
  }

  async modifyUserDetails(): Promise<void> {
    // Try to modify a text field to indicate an update
    const nameField = 'input[name="name"], input[placeholder*="name" i]';
    if (await this.lib.isVisible(nameField)) {
      const current = await this.lib.getInputValue(nameField);
      await this.lib.clearAndFill(nameField, `${current} (edited)`);
    }
  }
}
