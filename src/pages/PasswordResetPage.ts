import { Page } from 'playwright';
import { BasePage } from './BasePage';

export class PasswordResetPage extends BasePage {

  private readonly forgotEmailInput =
    "input[name='email'], input[type='email'], [data-testid='reset-email-input']";

  private readonly forgotSubmitBtn =
    "button[type='submit'], [data-testid='reset-submit']";

  private readonly confirmationMsg =
    "[class*='success'], [class*='alert-success'], [data-testid='reset-confirmation'], " +
    "p:has-text('reset'), p:has-text('sent'), p:has-text('email'), " +
    "[class*='message']:has-text('reset'), [class*='message']:has-text('sent')";

  private readonly newPasswordInput =
    "input[name='password'], input[name='newPassword'], input[type='password'], [data-testid='new-password']";

  private readonly confirmPassInput =
    "input[name='password_confirmation'], input[name='confirmPassword'], " +
    "input[name='confirm_password'], [data-testid='confirm-password']";

  private readonly resetSubmitBtn =
    "button[type='submit'], [data-testid='reset-password-btn']";

  private static readonly MAILINATOR_BASE =
    'https://www.mailinator.com/v4/public/inboxes.jsp?to=';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/forget-password'));
    await this.lib.waitForElement(this.forgotEmailInput);
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.forgotEmailInput);
  }

  async enterForgotEmail(email: string): Promise<void> {
    await this.lib.waitForElement(this.forgotEmailInput);
    await this.lib.clearAndFill(this.forgotEmailInput, email);
  }

  async submitForgotForm(): Promise<void> {
    await this.lib.click(this.forgotSubmitBtn);
  }

  async isConfirmationVisible(): Promise<boolean> {
    // Poll for up to 15 seconds for a confirmation state to appear
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      await this.page.waitForTimeout(1500);

      if (await this.lib.isVisible(this.confirmationMsg)) return true;

      try {
        const bodyText = (await this.page.locator('body').innerText()).toLowerCase();
        if (
          bodyText.includes('hang on') ||
          bodyText.includes('sent') ||
          bodyText.includes('check your email') ||
          bodyText.includes('check your inbox') ||
          bodyText.includes('password reset') ||
          bodyText.includes('reset link') ||
          bodyText.includes('email has been') ||
          bodyText.includes('instructions') ||
          bodyText.includes('please check')
        ) {
          console.log(`[PasswordResetPage] Confirmation detected in page text`);
          return true;
        }
      } catch { /* continue polling */ }
    }
    return false;
  }

  async openMailinatorInbox(email: string): Promise<Page> {
    const inbox = email.split('@')[0];
    // Encode so special chars (e.g. "+") survive the query string round-trip
    const inboxUrl = `${PasswordResetPage.MAILINATOR_BASE}${encodeURIComponent(inbox)}`;
    const newPage = await this.page.context().newPage();
    await newPage.goto(inboxUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`[PasswordResetPage] Opened Mailinator tab for inbox: ${inbox} (${inboxUrl})`);
    return newPage;
  }

  async waitForWelcomeEmail(mailinatorPage: Page): Promise<void> {
    const rowSelector = 'tr.ng-scope, table tbody tr';
    for (let i = 0; i < 12; i++) {
      await mailinatorPage.reload({ waitUntil: 'domcontentloaded' });
      await mailinatorPage.waitForTimeout(5000);
      const visible = await mailinatorPage.locator(rowSelector).first().isVisible().catch(() => false);
      if (visible) {
        console.log('[PasswordResetPage] Welcome email confirmed in Mailinator inbox');
        return;
      }
      console.log(`[PasswordResetPage] Waiting for welcome email... attempt ${i + 1}/12`);
    }
    console.log('[PasswordResetPage] Warning: no welcome email found — proceeding anyway');
  }

  async waitForAndClickResetEmail(mailinatorPage: Page): Promise<void> {
    const inboxUrl = mailinatorPage.url();
    const rowSelector = 'tr.ng-scope, table tbody tr';

    // Up to 20 attempts × 5 s = 100 s total
    for (let i = 0; i < 20; i++) {
      // Use reload() so Angular SPA state is preserved (avoids fresh-init flakiness)
      await mailinatorPage.reload({ waitUntil: 'networkidle', timeout: 30000 }).catch(async () => {
        // Fallback to full navigation if reload fails
        await mailinatorPage.goto(inboxUrl, { waitUntil: 'networkidle', timeout: 30000 });
      });
      await mailinatorPage.waitForTimeout(5000);

      const count = await mailinatorPage.locator(rowSelector).count();
      const url = mailinatorPage.url();
      console.log(`[PasswordResetPage] Attempt ${i + 1}/24 — ${count} row(s) — url: ${url}`);

      if (count >= 2) {
        // Prefer a row whose text mentions reset/password; otherwise newest (first) row.
        const resetRow = mailinatorPage.locator(`${rowSelector}`).filter({ hasText: /reset|password/i }).first();
        const targetRow = (await resetRow.count()) > 0 ? resetRow : mailinatorPage.locator(rowSelector).first();

        // Click the subject cell (3rd td) — the row itself may not carry the click handler.
        const subjectCell = targetRow.locator('td').nth(2);
        if ((await subjectCell.count()) > 0) {
          await subjectCell.click();
        } else {
          await targetRow.click();
        }

        // Verify the email actually opened: the message body iframe must attach.
        try {
          await mailinatorPage.waitForSelector(
            'iframe[id*="msg_body" i], #msg_pane, [id*="msg_iframe" i]',
            { timeout: 10000 }
          );
          console.log('[PasswordResetPage] Email opened — message body iframe attached');
          return;
        } catch {
          console.log('[PasswordResetPage] Click did not open the email — retrying');
        }
      }
    }

    throw new Error('Password reset email did not arrive in the Mailinator inbox within 100 seconds');
  }

  async extractResetLink(mailinatorPage: Page): Promise<string> {
    // The email body renders inside an iframe and can take a while to attach.
    // Poll all frames for up to 30 s, matching by href OR link text.
    const deadline = Date.now() + 30000;

    while (Date.now() < deadline) {
      await mailinatorPage.waitForTimeout(3000);

      const allLinks: { href: string; text: string; frame: string }[] = [];

      for (const frame of mailinatorPage.frames()) {
        try {
          const links = await frame.evaluate(() =>
            Array.from(document.querySelectorAll('a')).map((a) => ({
              href: a.getAttribute('href') || '',
              text: (a.textContent || '').trim()
            }))
          );
          for (const l of links) {
            allLinks.push({ ...l, frame: frame.name() || frame.url() });
          }
        } catch { /* cross-origin frame — skip */ }
      }

      const match = allLinks.find(
        (l) =>
          l.href.startsWith('http') &&
          l.href.includes('jobrator') &&
          (/reset|password|token|forget/i.test(l.href) || /reset|click here/i.test(l.text))
      ) || allLinks.find(
        (l) => l.href.startsWith('http') && (/reset|password|token/i.test(l.href) || /reset password|click here/i.test(l.text))
      );

      if (match) {
        console.log(`[PasswordResetPage] Reset link found in frame '${match.frame}': ${match.href}`);
        return match.href;
      }

      // Fallback A: regex-scan the raw HTML of every frame for a reset URL
      // (covers plain-text emails where the link is not an <a> tag)
      for (const frame of mailinatorPage.frames()) {
        try {
          const html = await frame.evaluate(() => document.documentElement.outerHTML);
          const urlMatches = html.match(/https?:\/\/[^\s"'<>\\]+/g) || [];
          const urlMatch = urlMatches.find(
            (u) => /reset|token|forget/i.test(u) && !/mailinator/i.test(u)
          );
          if (urlMatch) {
            // Decode HTML entities (e.g. &amp;)
            const decoded = urlMatch.replace(/&amp;/g, '&');
            console.log(`[PasswordResetPage] Reset URL found via HTML scan in frame '${frame.name() || frame.url()}': ${decoded}`);
            return decoded;
          }
        } catch { /* cross-origin frame — skip */ }
      }

      // Fallback B: switch to Mailinator's LINKS tab which lists all links in the email
      try {
        const linksTab = mailinatorPage.locator('a:has-text("LINKS"), button:has-text("LINKS"), [id*="links" i][role="tab"], #pills-links-tab').first();
        if (await linksTab.isVisible().catch(() => false)) {
          await linksTab.click();
          await mailinatorPage.waitForTimeout(2000);
          console.log('[PasswordResetPage] Clicked Mailinator LINKS tab');
        }
      } catch { /* tab not present — keep polling */ }

      console.log(
        `[PasswordResetPage] No reset link yet — ${mailinatorPage.frames().length} frame(s), ` +
        `${allLinks.length} link(s): ${allLinks.slice(0, 10).map((l) => `[${l.text}](${l.href.substring(0, 80)})`).join(', ')}`
      );
    }

    throw new Error('Could not find a password reset link in the Mailinator email');
  }

  async navigateToResetLink(resetLink: string): Promise<void> {
    await this.page.goto(resetLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.locator(this.newPasswordInput).first().waitFor({ state: 'visible', timeout: 15000 });
  }

  async setNewPassword(newPassword: string): Promise<void> {
    const newPwd = this.page.locator(this.newPasswordInput).first();
    await newPwd.clear();
    await newPwd.fill(newPassword);

    const confirm = this.page.locator(this.confirmPassInput).first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.clear();
      await confirm.fill(newPassword);
    }

    await this.page.locator(this.resetSubmitBtn).first().click();
    await this.page.waitForTimeout(2000);
    console.log('[PasswordResetPage] New password submitted');
  }
}
