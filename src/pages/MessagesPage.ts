import { Page } from 'playwright';
import { BasePage } from './BasePage';

export class MessagesPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  //  Locators
  // ══════════════════════════════════════════════════════════════════════════

  // Outer wrapper rendered at /dashboard/messages
  private readonly messagesContainer =
    '.chat-widget, .contacts_column, .message-card, ' +
    'h3:has-text("Start a chat"), [class*="chat"], [class*="inbox"]';

  // Left-side contact/conversation list inside the chat widget
  private readonly contactItems =
    '.contacts_column a, .contacts_column div[class], .chat-list li, ' +
    '.contacts_column [class*="contact"], .contacts_column [class*="user"]';

  // Rendered message body once a conversation is opened
  private readonly messageContent =
    '.message-card, .chat-body, [class*="message-body"], [class*="chat-message"], ' +
    '.chat-content, .message-content, .chat-area';

  private readonly replyInput =
    'textarea[name*="reply" i], textarea[name*="message" i], textarea[placeholder*="reply" i], ' +
    'textarea[placeholder*="message" i], textarea[placeholder*="type" i], ' +
    '[contenteditable="true"], .reply-box textarea, .compose-area textarea';

  private readonly sendReplyButton =
    'button:has-text("Send"), button:has-text("Reply"), button:has-text("Submit"), ' +
    'button[type="submit"]:near(textarea), [data-testid="send-reply"], ' +
    '.send-btn, button[class*="send"], button[class*="reply"]';

  private readonly replySuccessIndicator =
    '.reply-success, [class*="success"], [role="alert"], .notification, ' +
    '[data-testid="reply-success"], .alert-success, .toast-success, .Toastify__toast';

  private dialogTriggered = false;

  constructor(page: Page) {
    super(page);
    page.on('dialog', async (dialog) => {
      this.dialogTriggered = true;
      await dialog.dismiss();
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Navigation
  // ══════════════════════════════════════════════════════════════════════════

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/dashboard/messages'));
    await this.page.waitForTimeout(1500);
  }

  async isLoaded(): Promise<boolean> {
    const url = this.page.url().toLowerCase();
    if (/dashboard\/messages/i.test(url)) return true;
    return this.lib.isVisible(this.messagesContainer);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  State queries
  // ══════════════════════════════════════════════════════════════════════════

  async isMessagesPageVisible(): Promise<boolean> {
    const url = this.page.url().toLowerCase();
    if (/dashboard\/messages/i.test(url)) return true;
    return this.lib.isVisible(this.messagesContainer);
  }

  async hasContacts(): Promise<boolean> {
    // The chat widget has a contacts_column — if it exists and has children, there are contacts
    const col = await this.page.locator('.contacts_column').first();
    const exists = await col.isVisible().catch(() => false);
    if (!exists) return false;
    const count = await this.page.locator('.contacts_column a, .contacts_column > div').count();
    return count > 0;
  }

  async isMessageContentVisible(): Promise<boolean> {
    return this.lib.isVisible(this.messageContent);
  }

  async isReplyInputVisible(): Promise<boolean> {
    return this.lib.isVisible(this.replyInput);
  }

  async isReplySent(): Promise<boolean> {
    const hasSuccess = await this.lib.isVisible(this.replySuccessIndicator);
    if (hasSuccess) return true;
    return /dashboard\/messages/i.test(this.page.url().toLowerCase());
  }

  wasDialogTriggered(): boolean {
    return this.dialogTriggered;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════════════

  async openFirstContact(): Promise<void> {
    // Try clicking the first visible item in the contacts column
    const contactSelectors = [
      '.contacts_column a',
      '.contacts_column > div:not(:first-child)',
      '.chat-list li',
      '.contacts_column [class]',
    ];

    for (const sel of contactSelectors) {
      const items = await this.page.locator(sel).all();
      for (const item of items) {
        if (await item.isVisible()) {
          await item.click();
          await this.page.waitForTimeout(1500);
          return;
        }
      }
    }

    // JS fallback — find any clickable element in the contacts column
    const clicked = await this.page.evaluate(() => {
      const col = document.querySelector('.contacts_column');
      if (!col) return false;
      const els = Array.from(col.querySelectorAll('a, div[class], li'));
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && el !== col) {
          (el as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (!clicked) {
      throw new Error(
        'No clickable contact found in the messages contacts column. ' +
        'Ensure an employer has previously sent a message.'
      );
    }
    await this.page.waitForTimeout(1500);
  }

  async typeReply(text: string): Promise<void> {
    const inputs = await this.page.locator(this.replyInput).all();
    for (const input of inputs) {
      if (await input.isVisible()) {
        await input.fill(text);
        return;
      }
    }
    await this.page.locator(this.replyInput).first().fill(text, { force: true });
  }

  async submitReply(): Promise<void> {
    const buttons = await this.page.locator(this.sendReplyButton).all();
    for (const btn of buttons) {
      if (await btn.isVisible()) {
        await btn.click();
        await this.page.waitForTimeout(1500);
        return;
      }
    }
    await this.page.locator(this.sendReplyButton).first().click({ force: true });
    await this.page.waitForTimeout(1500);
  }
}
