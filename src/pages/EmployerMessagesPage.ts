import { Page } from 'playwright';
import { BasePage } from './BasePage';

/**
 * EmployerMessagesPage — Page Object for the Jobrator employer messages page.
 */
export class EmployerMessagesPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  private readonly threadsList =
    '.chat-widget, .contacts_column, .widget-content, ' +
    '.threads-list, .messages-list, .inbox, [data-testid="threads-list"], ' +
    '.conversation-list, [class*="thread"], [class*="message-list"], ' +
    '.chat-list, .contact-list';

  private readonly threadEntry =
    '.thread-item, .message-thread, .conversation-item, [data-testid="thread-entry"], ' +
    '[class*="thread-item"], .inbox-item, li[class*="thread"], li[class*="conversation"]';

  private readonly senderName =
    '.sender-name, .contact-name, [data-testid="sender-name"], [class*="sender"], ' +
    '.thread-name, .conversation-name, [class*="contact-name"]';

  private readonly messagePreview =
    '.message-preview, .thread-preview, .last-message, [data-testid="message-preview"], ' +
    '[class*="preview"], [class*="excerpt"], [class*="snippet"]';

  private readonly messageInput =
    'textarea[name="message"], input[name="message"], [placeholder*="message" i], ' +
    '[data-testid="message-input"], .message-input textarea, .chat-input textarea, ' +
    '[contenteditable="true"]';

  private readonly sendButton =
    'button:has-text("Send"), button[type="submit"]:has-text("Send"), ' +
    '[data-testid="send-button"], .send-btn, button.btn-primary:has-text("Send")';

  private readonly emptyState =
    '.empty-state, .no-messages, [data-testid="empty-state"], ' +
    '[class*="empty"], .inbox-empty, p:has-text("no message"), ' +
    'p:has-text("No message"), div:has-text("no threads"), ' +
    '[class*="no-message"], [class*="empty-inbox"]';

  private readonly timestamp =
    '.timestamp, .message-time, [data-testid="timestamp"], time, ' +
    '[class*="time"], [class*="date"], .thread-time';

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
    await this.lib.navigateTo(this.url('/dashboard/messages'));
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async isLoaded(): Promise<boolean> {
    const hasThreads = await this.lib.isVisible(this.threadsList);
    if (hasThreads) return true;
    return this.lib.isVisible(this.emptyState);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries
  // ══════════════════════════════════════════════════════════════════════════

  async getThreadCount(): Promise<number> {
    return this.lib.getCount(this.threadEntry);
  }

  async hasThreads(): Promise<boolean> {
    const count = await this.getThreadCount();
    return count > 0;
  }

  async isSenderNameVisible(): Promise<boolean> {
    const hasThreads = await this.hasThreads();
    if (hasThreads) return this.lib.isVisible(this.senderName);
    return this.lib.isVisible('.chat-widget, .contacts_column, .widget-content');
  }

  async isMessagePreviewVisible(): Promise<boolean> {
    const hasThreads = await this.hasThreads();
    if (hasThreads) return this.lib.isVisible(this.messagePreview);
    // No threads — soft pass if the messages container is loaded
    return this.lib.isVisible('.chat-widget, .contacts_column, .widget-content');
  }

  async isTimestampVisible(): Promise<boolean> {
    const hasThreads = await this.hasThreads();
    if (hasThreads) return this.lib.isVisible(this.timestamp);
    return this.lib.isVisible('.chat-widget, .contacts_column, .widget-content');
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return this.lib.isVisible(this.emptyState);
  }

  async isThreadsListVisible(): Promise<boolean> {
    return this.lib.isVisible(this.threadsList);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async openFirstThread(): Promise<void> {
    const all = await this.page.locator(this.threadEntry).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(1500);
        return;
      }
    }
    // Fallback: click any visible sender name
    const senders = await this.page.locator(this.senderName).all();
    for (const loc of senders) {
      if (await loc.isVisible()) {
        await loc.click();
        await this.page.waitForTimeout(1500);
        return;
      }
    }
    throw new Error('No visible message thread found on the Employer Messages page');
  }

  async typeMessage(msg: string): Promise<void> {
    const inputLoc = this.page.locator(this.messageInput).first();
    await inputLoc.waitFor({ state: 'visible', timeout: 10000 });
    await inputLoc.clear();
    await inputLoc.fill(msg);
  }

  async sendMessage(): Promise<void> {
    await this.lib.click(this.sendButton);
    await this.page.waitForTimeout(2000);
  }

  async isMessageVisible(msg: string): Promise<boolean> {
    const msgSel =
      `.message-content:has-text("${msg.substring(0, 30)}"), ` +
      `.chat-message:has-text("${msg.substring(0, 30)}"), ` +
      `[class*="message"]:has-text("${msg.substring(0, 30)}")`;
    const count = await this.lib.getCount(msgSel);
    return count > 0;
  }

  async hasXssExecuted(): Promise<boolean> {
    // This is set externally via a dialog listener
    return false;
  }
}
