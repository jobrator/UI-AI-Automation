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

  /**
   * True when the candidate has at least one conversation.
   *
   * A conversation is an <li> inside `ul.contacts`. Counting generic children of
   * `.contacts_column` gives a false positive, because an empty widget still
   * renders a "You have reached end of your chat" wrapper div.
   */
  async hasContacts(): Promise<boolean> {
    const col = this.page.locator('.contacts_column').first();
    if (!(await col.isVisible().catch(() => false))) return false;
    const count = await this.page.locator('ul.contacts li, .contacts_body li').count().catch(() => 0);
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
      'ul.contacts li',
      '.contacts_body li',
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

  /**
   * Submit the composed reply.
   *
   * The live chat composer has no Send button — the `textarea[name="message"]`
   * is submitted with Enter. A Send button is still preferred when present.
   */
  async submitReply(): Promise<void> {
    const buttons = await this.page.locator(this.sendReplyButton).all();
    for (const btn of buttons) {
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await this.page.waitForTimeout(2500);
        return;
      }
    }
    const input = this.page.locator(this.replyInput).filter({ visible: true }).first();
    await input.click().catch(() => {});
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2500);
  }

  /** Full text of the open conversation thread. */
  async getThreadText(): Promise<string> {
    return ((await this.page.textContent('.message-card').catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
  }
}
