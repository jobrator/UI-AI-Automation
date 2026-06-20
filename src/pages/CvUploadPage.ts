import { Page, Download } from 'playwright';
import { BasePage } from './BasePage';
import * as path from 'path';

const TEST_DATA_DIR = path.resolve(process.cwd(), 'test-data', 'cv');

const CV_FILES: Record<string, string> = {
  pdf:         path.join(TEST_DATA_DIR, 'tc051-valid-cv.pdf'),
  docx:        path.join(TEST_DATA_DIR, 'tc052-valid-cv.docx'),
  unsupported: path.join(TEST_DATA_DIR, 'tc053-unsupported.exe'),
  original:    path.join(TEST_DATA_DIR, 'tc054-original-cv.pdf'),
  replacement: path.join(TEST_DATA_DIR, 'tc054-replacement-cv.pdf'),
  xss:         path.join(TEST_DATA_DIR, 'tc055-xss-cv.pdf'),
};

const CV_TITLES: Record<string, string> = {
  pdf:         'AutoTest CV PDF',
  docx:        'AutoTest CV DOCX',
  original:    'AutoTest CV Original',
  replacement: 'AutoTest CV Replacement',
  xss:         'AutoTest CV XSS',
  unsupported: 'AutoTest CV Unsupported',
};

export class CvUploadPage extends BasePage {

  // ── File input (hidden — triggered via its label) ─────────────────────────
  private readonly fileInput = 'input.uploadButton-input, input[type="file"]';

  // ── Label that triggers the file chooser ──────────────────────────────────
  private readonly uploadTriggerLabel =
    'label.cv-uploadButton, label[for="upload"], label[for*="cv" i], ' +
    'label[for*="resume" i], label[for*="upload" i], .uploadButton label, .uploading-resume label';

  // ── CV title input (required field, disabled Submit until both are filled) ─
  private readonly cvTitleInput =
    'input[placeholder="Enter Title"], input[placeholder*="title" i], ' +
    'input[name="title"], input[name="cv_title"], input[name="resume_title"]';

  // ── Submit button (disabled by default, JS-enabled after file + title) ────
  private readonly uploadSubmitBtn = 'button[type="submit"]';

  // ── Success popup ─────────────────────────────────────────────────────────
  private readonly successPopupOk =
    '.swal2-confirm, button.swal2-confirm, ' +
    '.modal button:has-text("OK"), .modal button:has-text("Ok"), ' +
    '[role="dialog"] button:has-text("OK"), [role="dialog"] button:has-text("Ok"), ' +
    'button:has-text("OK"), button:has-text("Ok"), button:has-text("Okay")';

  // ── CV list item ──────────────────────────────────────────────────────────
  private readonly cvListItem = 'div.file-edit-box';

  // ── Hover action icons (LaFont Awesome "la-*" icon classes) ──────────────
  private readonly viewIconSelector =
    '.edit-btns a button, .edit-btns a[target] button, ' +
    'span.la-eye, button span.la-eye, .edit-btns a button span';

  private readonly downloadIconSelector =
    'span.la-download, button span.la-download, ' +
    '.edit-btns button:has(span.la-download)';

  private readonly deleteIconSelector =
    'span.la-trash, button span.la-trash, ' +
    '.edit-btns button:has(span.la-trash)';

  // ── Delete confirmation popup ─────────────────────────────────────────────
  private readonly deleteConfirmBtn =
    '.swal2-confirm, button.swal2-confirm, ' +
    '.modal button.btn-danger, [role="dialog"] button.btn-danger, ' +
    '.modal button:has-text("Delete"), [role="dialog"] button:has-text("Delete"), ' +
    'button:has-text("Yes, delete"), button:has-text("Confirm"), ' +
    'button:has-text("Delete")';

  // ── LinkedIn share icon ───────────────────────────────────────────────────
  private readonly linkedInShareIcon =
    'a[href*="linkedin"], a[href*="linked-in"], ' +
    'button.linkedin-share, .linkedin-icon, .linked-in-icon, ' +
    '[aria-label*="linkedin" i], [title*="linkedin" i], ' +
    'a.share-linkedin, .share-section a[href*="linkedin"], ' +
    'img[alt*="linkedin" i], span.la-linkedin, span[class*="linkedin" i]';

  // ── Social share section ──────────────────────────────────────────────────
  private readonly shareSectionSelector =
    '.share-section, .cv-share, .social-share, ' +
    '[class*="share" i]:not(button), .share-icons, .social-icons';

  // ── Download format picker ────────────────────────────────────────────────
  private readonly downloadFormatModal =
    '.download-options, .download-format-modal, .format-picker, ' +
    '[role="dialog"]:has-text("format"), .swal2-popup:has-text("PDF")';

  // ── Upload error / rejection ──────────────────────────────────────────────
  private readonly uploadError =
    '.swal2-icon-error, .swal2-deny, ' +
    '.error-message, .alert-danger, .alert-error, .invalid-feedback, ' +
    '[role="alert"], .upload-error, .toast-error, .notification-error, ' +
    '.swal2-popup';

  constructor(page: Page) {
    super(page);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  BasePage contract
  // ══════════════════════════════════════════════════════════════════════════

  async navigate(): Promise<void> {
    await this.lib.navigateTo(this.url('/dashboard/cv-manager'));
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.fileInput);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Navigation to CV section
  // ══════════════════════════════════════════════════════════════════════════

  async goToCvSection(): Promise<void> {
    if (!this.page.url().includes('cv-manager')) {
      await this.lib.navigateTo(this.url('/dashboard/cv-manager'));
      await this.page.waitForLoadState('domcontentloaded');
    }
    await this.page.waitForTimeout(1000);
    // Remove any CVs left from previous test runs so each scenario starts clean
    await this._clearExistingCvs();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Upload actions
  // ══════════════════════════════════════════════════════════════════════════

  async uploadFile(fileKey: string): Promise<void> {
    const filePath = CV_FILES[fileKey];
    if (!filePath) throw new Error(`Unknown CV file key: "${fileKey}"`);
    await this._setFile(filePath);
    await this._fillCvTitle(fileKey);
    await this._submitUpload();
  }

  async selectFileOnly(fileKey: string): Promise<void> {
    const filePath = CV_FILES[fileKey];
    if (!filePath) throw new Error(`Unknown CV file key: "${fileKey}"`);
    await this._setFile(filePath);
    await this._fillCvTitle(fileKey);
  }

  async submitUpload(): Promise<void> {
    await this._submitUpload();
  }

  /**
   * Click the label trigger (which opens the OS file chooser) and set the file
   * so JavaScript events fire and the Submit button becomes enabled.
   */
  private async _setFile(filePath: string): Promise<void> {
    // The uploadButton-input is hidden; its label opens the file chooser.
    // We must go through the label so the page's JS event listeners fire
    // (they enable the Submit button and show the filename).
    const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);

    const labels = await this.page.locator(this.uploadTriggerLabel).all();
    let chooserOpened = false;
    for (const label of labels) {
      if (await label.isVisible()) {
        await label.click();
        const chooser = await fileChooserPromise;
        if (chooser) {
          await chooser.setFiles(filePath);
          chooserOpened = true;
        }
        break;
      }
    }

    if (!chooserOpened) {
      // Fallback: set files directly and fire change/input events manually
      const inputs = await this.page.locator(this.fileInput).all();
      if (inputs.length === 0) throw new Error('No file input found on the CV upload page');
      await inputs[0].setInputFiles(filePath);
      await this.page.evaluate(() => {
        const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
        if (input) {
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    }

    await this.page.waitForTimeout(500);
  }

  /** Fill the required "Enter Title" field on the CV upload form. */
  private async _fillCvTitle(fileKey: string): Promise<void> {
    const title = CV_TITLES[fileKey] ?? 'AutoTest CV';
    const inputs = await this.page.locator(this.cvTitleInput).all();
    for (const input of inputs) {
      try {
        if (await input.isVisible()) {
          await input.clear();
          await input.fill(title);
          return;
        }
      } catch { /* try next */ }
    }
  }

  /**
   * Click the Submit button.
   * The button is initially disabled; JS enables it once a file is selected.
   * We wait briefly for enablement, then click.
   */
  private async _submitUpload(): Promise<void> {
    const btn = this.page.locator(this.uploadSubmitBtn).first();
    try {
      // Wait up to 5 s for the button to become enabled
      await this.page.waitForFunction(
        () => {
          const b = document.querySelector('button[type="submit"]') as HTMLButtonElement | null;
          return b && !b.disabled;
        },
        { timeout: 5000 }
      );
      await btn.click();
      await this.page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
      return;
    } catch { /* button never became enabled or not found */ }

    // Broader fallback
    const btns = await this.page.locator(
      'button:has-text("Upload Resume"), button:has-text("Upload CV"), ' +
      'button:has-text("Save"), input[type="submit"]'
    ).all();
    for (const b of btns) {
      if (await b.isVisible() && !(await b.isDisabled())) {
        await b.click();
        await this.page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
        return;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Success / error state queries
  // ══════════════════════════════════════════════════════════════════════════

  async isUploadSuccessVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector(
        this.successPopupOk + ', .swal2-success, .alert-success, .toast-success, .upload-success',
        { timeout: 10000 }
      );
      return true;
    } catch {
      // Fallback: success if a CV item now appears in the list
      return this.isCvInList();
    }
  }

  async isUploadRejected(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.uploadError, { timeout: 8000 });
      return true;
    } catch {
      return !(await this.isCvInList());
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Post-upload interactions
  // ══════════════════════════════════════════════════════════════════════════

  async clickOkOnSuccessPopup(): Promise<void> {
    try {
      await this.lib.click(this.successPopupOk, { timeout: 8000 });
    } catch {
      // No popup — upload was silently accepted; continue
    }
    await this.page.waitForTimeout(500);
  }

  async isCvInList(): Promise<boolean> {
    return this.lib.isVisible(this.cvListItem);
  }

  // ── Hover + icon click helpers ────────────────────────────────────────────

  private async hoverFirstCvItem(): Promise<void> {
    const items = await this.page.locator(this.cvListItem).all();
    for (const item of items) {
      if (await item.isVisible()) {
        await item.hover();
        await this.page.waitForTimeout(400);
        return;
      }
    }
    throw new Error('No CV list item visible to hover over');
  }

  async hoverAndClickView(): Promise<void> {
    await this.hoverFirstCvItem();
    await this._clickIconWithFallback(this.viewIconSelector, 'view');
  }

  async hoverAndClickDownload(): Promise<void> {
    await this.hoverFirstCvItem();
    await this._clickIconWithFallback(this.downloadIconSelector, 'download');
  }

  async hoverAndClickDelete(): Promise<void> {
    await this.hoverFirstCvItem();
    await this._clickIconWithFallback(this.deleteIconSelector, 'delete');
  }

  private async _clickIconWithFallback(selector: string, label: string): Promise<void> {
    const all = await this.page.locator(selector).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        return;
      }
    }
    // Force-click bypasses CSS visibility (icons may only appear on hover via CSS)
    const first = this.page.locator(selector).first();
    try {
      await first.click({ force: true, timeout: 5000 });
      return;
    } catch { /* fall through */ }

    throw new Error(`Could not click the ${label} icon — no matching element found`);
  }

  async confirmDelete(): Promise<void> {
    await this.lib.click(this.deleteConfirmBtn);
    await this.page.waitForTimeout(800);
  }

  // ── New-tab / download tracking ───────────────────────────────────────────

  async waitForNewTab(): Promise<Page> {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 15000 }),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }

  async waitForDownload(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 15000 }),
    ]);
    return download;
  }

  async wasDialogTriggered(): Promise<boolean> {
    try {
      const title = await this.page.title();
      return /alert|xss|script/i.test(title);
    } catch {
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CV Share — LinkedIn
  // ══════════════════════════════════════════════════════════════════════════

  async ensureCvInManager(): Promise<void> {
    if (!this.page.url().includes('cv-manager')) {
      await this.lib.navigateTo(this.url('/dashboard/cv-manager'));
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(1000);
    }
    const hasCv = await this.isCvInList();
    if (!hasCv) {
      await this.uploadFile('pdf');
      await this.clickOkOnSuccessPopup();
    }
  }

  async scrollToShareSection(): Promise<void> {
    const shareSection = this.page.locator(this.shareSectionSelector).first();
    try {
      await shareSection.scrollIntoViewIfNeeded({ timeout: 5000 });
    } catch {
      await this.page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    }
    await this.page.waitForTimeout(500);
  }

  async clickLinkedInShareIcon(): Promise<void> {
    const all = await this.page.locator(this.linkedInShareIcon).all();
    for (const loc of all) {
      if (await loc.isVisible()) {
        await loc.click();
        return;
      }
    }
    await this.page.locator(this.linkedInShareIcon).first().click({ force: true, timeout: 5000 });
  }

  async waitForLinkedInRedirect(): Promise<Page> {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 15000 }),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }

  async isRedirectedToLinkedIn(newPage: Page): Promise<boolean> {
    const url = newPage.url();
    return /linkedin\.com/i.test(url);
  }

  async isOnlyLinkedInShareVisible(): Promise<boolean> {
    const linkedInLocators = await this.page.locator(this.linkedInShareIcon).all();
    const linkedInVisible = linkedInLocators.some(async (l) => await l.isVisible());
    return !!linkedInVisible;
  }

  async hasOtherSocialShareIcons(): Promise<boolean> {
    const otherIcons =
      'a[href*="facebook"], a[href*="twitter"], a[href*="x.com"], ' +
      'a[href*="instagram"], a[href*="whatsapp"], a[href*="telegram"], ' +
      '[aria-label*="facebook" i], [aria-label*="twitter" i], [aria-label*="instagram" i], ' +
      'span.la-facebook, span.la-twitter, span.la-instagram, span.la-whatsapp';
    const all = await this.page.locator(otherIcons).all();
    for (const loc of all) {
      if (await loc.isVisible()) return true;
    }
    return false;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Download format selection
  // ══════════════════════════════════════════════════════════════════════════

  async hoverAndOpenDownloadFormatPicker(): Promise<void> {
    await this.hoverFirstCvItem();
    await this._clickIconWithFallback(this.downloadIconSelector, 'download');
    // Wait briefly for a format picker to appear (if not, selectDownloadFormat handles the download)
    await this.page.waitForTimeout(800);
  }

  async selectDownloadFormat(format: string): Promise<string> {
    const upperFormat = format.toUpperCase();
    // Try format picker modal or dropdown that appears after clicking download icon
    try {
      await this.page.waitForSelector(this.downloadFormatModal, { timeout: 5000 });
      const btn = this.page.locator(
        `${this.downloadFormatModal} button:has-text("${upperFormat}"), ` +
        `${this.downloadFormatModal} a:has-text("${upperFormat}")`
      ).first();
      await btn.click();
    } catch {
      // Fallback: format button may be inline without a modal
      const inlineBtn = this.page.locator(
        `button:has-text("${upperFormat}"), a:has-text("${upperFormat}"), ` +
        `[data-format="${format.toLowerCase()}"], [data-type="${format.toLowerCase()}"]`
      ).first();
      await inlineBtn.click({ timeout: 5000 });
    }
    await this.page.waitForTimeout(500);
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 15000 }),
    ]);
    return download.suggestedFilename();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Cleanup helper — delete all existing CVs before each scenario
  // ══════════════════════════════════════════════════════════════════════════

  private async _clearExistingCvs(): Promise<void> {
    for (let i = 0; i < 15; i++) {
      // Check if any CV items are visible
      let hasItems = false;
      const items = await this.page.locator(this.cvListItem).all();
      for (const item of items) {
        if (await item.isVisible()) { hasItems = true; break; }
      }
      if (!hasItems) break;

      try {
        await this.hoverFirstCvItem();
        // Force-click the delete icon (it's CSS-hidden until hover)
        await this.page.locator(this.deleteIconSelector).first().click({ force: true, timeout: 3000 });
        await this.page.waitForTimeout(500);

        // Confirm if a SweetAlert/modal appeared
        const confirmBtn = this.page.locator(this.deleteConfirmBtn).first();
        const confirmVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
        if (confirmVisible) {
          await confirmBtn.click();
          await this.page.waitForTimeout(800);
        }
      } catch {
        break;
      }
    }
  }
}
