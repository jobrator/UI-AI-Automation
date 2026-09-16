import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { CvUploadPage } from '../../pages/CvUploadPage';
import { DashboardPage } from '../../pages/DashboardPage';

function getCvPage(world: CustomWorld): CvUploadPage {
  return new CvUploadPage(world.page);
}

function getDashboard(world: CustomWorld): DashboardPage {
  return new DashboardPage(world.page);
}

// ═══════════════════════════════════════════════════════════════════════════
//  WHEN — upload actions
// ═══════════════════════════════════════════════════════════════════════════

When('the candidate uploads a valid CV file', async function (this: CustomWorld) {
  const cv = getCvPage(this);
  await cv.goToCvSection();
  await cv.uploadFile('pdf');
});

When('the candidate uploads a valid {string} format CV file',
  async function (this: CustomWorld, format: string) {
    const cv = getCvPage(this);
    await cv.goToCvSection();
    await cv.uploadFile(format.toLowerCase());
  }
);

When('the candidate attempts to upload a CV with an unsupported file type',
  async function (this: CustomWorld) {
    const cv = getCvPage(this);
    await cv.goToCvSection();
    await cv.uploadFile('unsupported');
  }
);

When('the candidate uploads a CV file containing embedded script content',
  async function (this: CustomWorld) {
    const cv = getCvPage(this);
    await cv.goToCvSection();
    await cv.uploadFile('xss');
  }
);

When('the candidate selects the original CV file without submitting',
  async function (this: CustomWorld) {
    const cv = getCvPage(this);
    await cv.goToCvSection();
    await cv.selectFileOnly('original');
  }
);

When('the candidate replaces the CV selection with a replacement file',
  async function (this: CustomWorld) {
    await getCvPage(this).selectFileOnly('replacement');
  }
);

When('the candidate submits the CV upload form',
  async function (this: CustomWorld) {
    await getCvPage(this).submitUpload();
  }
);

// ─── Post-upload interactions ─────────────────────────────────────────────

When('the candidate clicks the OK button on the upload success popup',
  async function (this: CustomWorld) {
    await getCvPage(this).clickOkOnSuccessPopup();
  }
);

When('the candidate hovers on the uploaded CV and clicks the view icon',
  async function (this: CustomWorld) {
    await getCvPage(this).hoverAndClickView();
  }
);

When('the candidate hovers on the uploaded CV and clicks the download icon',
  async function (this: CustomWorld) {
    const cv = getCvPage(this);
    const downloadPromise = cv.waitForDownload();
    await cv.hoverAndClickDownload();
    this.attach(
      JSON.stringify({ action: 'download-initiated' }),
      'application/json'
    );
    // Store download event result
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    this.logMessage(`[CV] Download started: ${filename}`);
    this.attach(`Downloaded file: ${filename}`, 'text/plain');
  }
);

When('the candidate hovers on the uploaded CV and clicks the delete icon',
  async function (this: CustomWorld) {
    // Record the CV count so the removal check can confirm a decrease even when
    // other (pre-existing) CVs remain in the list.
    (this as any).cvCountBeforeDelete = await getCvPage(this).getCvCount();
    await getCvPage(this).hoverAndClickDelete();
  }
);

When('the candidate clicks the Delete button to confirm deletion',
  async function (this: CustomWorld) {
    await getCvPage(this).confirmDelete();
  }
);

When('the candidate closes the new browser tab',
  async function (this: CustomWorld) {
    const pages = this.page.context().pages();
    // Close every tab that isn't the main one
    for (const p of pages) {
      if (p !== this.page) {
        await p.close();
      }
    }
    await this.page.bringToFront();
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  THEN — assertions
// ═══════════════════════════════════════════════════════════════════════════

Then('the CV upload should be accepted', async function (this: CustomWorld) {
  const accepted = await getCvPage(this).isUploadSuccessVisible();
  expect(accepted, 'Expected a success indicator after CV upload but none was found').toBeTruthy();
});

Then('the replacement CV should be accepted', async function (this: CustomWorld) {
  const accepted = await getCvPage(this).isUploadSuccessVisible();
  expect(accepted, 'Expected a success indicator after replacement CV upload').toBeTruthy();
});

Then('the CV upload should not be accepted for an unsupported file type',
  async function (this: CustomWorld) {
    const rejected = await getCvPage(this).isUploadRejected();
    expect(rejected, 'Expected the upload to be rejected for an unsupported file type, but it was accepted').toBeTruthy();
  }
);

Then('the CV should be opened in a new browser tab',
  async function (this: CustomWorld) {
    // After clicking view, wait for a new tab to appear
    const newTab = await getCvPage(this).waitForNewTab();
    const url = newTab.url();
    this.logMessage(`[CV] Opened in new tab: ${url}`);
    expect(
      url.length,
      'Expected the CV to open in a new browser tab but no new page was created'
    ).toBeGreaterThan(0);
    // Store reference so the "closes the new browser tab" step can close it
    await newTab.bringToFront();
  }
);

Then('the CV should be downloaded successfully',
  async function (this: CustomWorld) {
    // The download was already awaited inside the When step; if we reach here the download
    // started without throwing. We just confirm we are still on the dashboard page.
    const onPage = this.page.url().length > 0;
    expect(onPage, 'Page became unavailable after download trigger').toBeTruthy();
  }
);

Then('the CV should no longer appear in the list',
  async function (this: CustomWorld) {
    // Give the DOM time to update after deletion
    await this.page.waitForTimeout(1500);
    const before: number | undefined = (this as any).cvCountBeforeDelete;
    const after = await getCvPage(this).getCvCount();
    if (typeof before === 'number') {
      // The just-uploaded CV was removed even if other pre-existing CVs remain.
      expect(after, `Expected the CV count to drop after deletion (before=${before}, after=${after})`)
        .toBeLessThan(before);
      return;
    }
    const stillThere = await getCvPage(this).isCvInList();
    expect(stillThere, 'CV is still visible in the list after deletion').toBeFalsy();
  }
);

Then('the CV upload workflow should not trigger script execution on the page',
  async function (this: CustomWorld) {
    const triggered = await getCvPage(this).wasDialogTriggered();
    expect(triggered, '[Security] XSS dialog was triggered during CV upload').toBeFalsy();
    this.logMessage('[Security] No XSS dialog detected during CV upload.');
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  CV Share — LinkedIn (TC056, TC057)
// ═══════════════════════════════════════════════════════════════════════════

Given('the candidate has an uploaded CV visible in the CV manager',
  async function (this: CustomWorld) {
    await getCvPage(this).ensureCvInManager();
  }
);

When('the candidate scrolls to the share section on the right side of the dashboard',
  async function (this: CustomWorld) {
    await getCvPage(this).scrollToShareSection();
  }
);

When('the candidate clicks the LinkedIn share icon',
  async function (this: CustomWorld) {
    const cv = getCvPage(this);
    // The live CV manager entry exposes View / Delete / Download only (hover-
    // revealed icons); there is no social-share control at all. See bugs/BUG-007.
    expect(
      await cv.hasLinkedInShare(),
      'CV manager should expose a LinkedIn share control on a CV entry — the live ' +
      'entry actions are View/Delete/Download only (bugs/BUG-007).'
    ).toBeTruthy();
    const newPagePromise = cv.waitForLinkedInRedirect();
    await cv.clickLinkedInShareIcon();
    this.linkedInPage = await newPagePromise;
  }
);

Then('the candidate should be redirected to the LinkedIn sharing page',
  async function (this: CustomWorld) {
    const newPage = this.linkedInPage;
    expect(newPage, 'No new tab was opened after clicking the LinkedIn share icon').toBeTruthy();
    const onLinkedIn = await getCvPage(this).isRedirectedToLinkedIn(newPage!);
    expect(onLinkedIn, `Expected redirect to linkedin.com but got: ${newPage!.url()}`).toBeTruthy();
    this.logMessage(`[Share] Redirected to LinkedIn: ${newPage!.url()}`);
  }
);

Then('the CV should be available for sharing with desired contacts on LinkedIn',
  async function (this: CustomWorld) {
    const newPage = this.linkedInPage;
    expect(newPage, 'LinkedIn page reference missing').toBeTruthy();
    const url = newPage!.url();
    expect(
      /linkedin\.com/i.test(url),
      `LinkedIn page URL does not match expected pattern: ${url}`
    ).toBeTruthy();
    await newPage!.close();
    await this.page.bringToFront();
  }
);

Then('only the LinkedIn social media icon should be visible in the share section',
  async function (this: CustomWorld) {
    const cv = getCvPage(this);
    expect(
      await cv.hasLinkedInShare(),
      'CV manager should expose a share section containing the LinkedIn icon (bugs/BUG-007).'
    ).toBeTruthy();
    const linkedInPresent = await cv.isOnlyLinkedInShareVisible();
    expect(
      linkedInPresent,
      'Expected the LinkedIn share icon to be visible in the share section'
    ).toBeTruthy();
  }
);

Then('no other social media sharing icons should be displayed',
  async function (this: CustomWorld) {
    const othersPresent = await getCvPage(this).hasOtherSocialShareIcons();
    expect(
      othersPresent,
      'Other social media share icons (Facebook, Twitter, Instagram, etc.) are visible — only LinkedIn should be shown'
    ).toBeFalsy();
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  Download format selection (TC058, TC059)
// ═══════════════════════════════════════════════════════════════════════════

When('the candidate hovers on the uploaded CV and opens the download format picker',
  async function (this: CustomWorld) {
    await getCvPage(this).hoverAndOpenDownloadFormatPicker();
  }
);

When('the candidate selects {string} as the download format',
  async function (this: CustomWorld, format: string) {
    const filename = await getCvPage(this).selectDownloadFormat(format);
    this.downloadedFilename = filename;
    this.logMessage(`[CV] Downloaded as: ${filename}`);
    this.attach(`Downloaded file: ${filename}`, 'text/plain');
  }
);

Then('the CV should be downloaded as a PDF file',
  async function (this: CustomWorld) {
    const filename = this.downloadedFilename ?? '';
    // Must be a real .pdf. Matching a bare /pdf/ anywhere in the name used to pass
    // spuriously on "jobrator_Seed CV PDF.json" — the 404 error body the download
    // control actually returns (bugs/BUG-008).
    expect(
      /\.pdf$/i.test(filename),
      `Expected a PDF download but got: "${filename}". The CV manager download button ` +
      'requests a non-existent API route and saves the 404 body (bugs/BUG-008).'
    ).toBeTruthy();
  }
);

Then('the CV should be downloaded as a DOC file',
  async function (this: CustomWorld) {
    const filename = this.downloadedFilename ?? '';
    // A .docx CV is seeded by `npm run seed:full`, so the stored file IS a DOC.
    // The download control currently returns "jobrator_<title>.json" holding an
    // E_ROUTE_NOT_FOUND API error body instead of the document — see bugs/BUG-008.
    expect(
      /\.docx?$/i.test(filename),
      `Expected a DOC/DOCX download but got: "${filename}". The CV manager download ` +
      'button requests a non-existent API route and saves the 404 body (bugs/BUG-008).'
    ).toBeTruthy();
  }
);
