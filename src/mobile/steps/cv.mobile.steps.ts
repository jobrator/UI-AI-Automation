import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { MobileWorld } from '../support/mobile.world';
import { CvManagerScreen } from '../screens/CvManagerScreen';

/**
 * The document the picker should offer. Push it to the device before running:
 *   adb push test-data/cv/tc051-valid-cv.pdf /sdcard/Download/tc051-valid-cv.pdf
 */
const CV_DEVICE_PATH = process.env.MOBILE_CV_DEVICE_PATH || '/sdcard/Download/tc051-valid-cv.pdf';
const CV_DISPLAY_NAME = process.env.MOBILE_CV_DISPLAY_NAME || 'tc051-valid-cv';

// ═══════════════════════════════════════════════════════════════════════════════
//  CV upload — ADO #29943 and #28140
// ═══════════════════════════════════════════════════════════════════════════════

When('I tap on the CV Manager button', async function (this: MobileWorld) {
  const screen = new CvManagerScreen(this.driver);
  await screen.open();
  // Capture the pre-upload count here so #28140 can assert on the delta later.
  this.cvCountBefore = await screen.getCvCount();
  this.logMessage(`CV count before upload: ${this.cvCountBefore}`);
});

When('I tap on the CV Upload button', async function (this: MobileWorld) {
  await new CvManagerScreen(this.driver).tapUpload();
});

When('I am redirected to CV file location on my device', async function (this: MobileWorld) {
  // The OS document picker lives outside the app context; just let it settle.
  await this.driver.pause(2500);
  this.logMessage(`Expecting document "${CV_DISPLAY_NAME}" at ${CV_DEVICE_PATH}`);
});

When('I select the document', async function (this: MobileWorld) {
  await new CvManagerScreen(this.driver).selectDocument(CV_DEVICE_PATH, CV_DISPLAY_NAME);
});

When('I tap Submit button', async function (this: MobileWorld) {
  await new CvManagerScreen(this.driver).submit();
});

Then('my CV should be uploaded successfully', async function (this: MobileWorld) {
  const screen = new CvManagerScreen(this.driver);
  const ok = await screen.isUploadSuccessVisible();
  if (!ok) await this.attachScreenshot('cv-upload-no-confirmation');
  expect(ok, 'Expected an upload success confirmation after submitting the CV.').toBe(true);
});

Then(
  'the uploaded CV should appear in the list without refreshing the screen',
  async function (this: MobileWorld) {
    const screen = new CvManagerScreen(this.driver);
    await this.driver.pause(3000);

    const before = this.cvCountBefore ?? 0;
    const afterNoRefresh = await screen.getCvCount();
    this.logMessage(`CV count without refresh: ${afterNoRefresh} (was ${before})`);

    if (afterNoRefresh <= before) {
      // Distinguish "the list is stale" (the bug) from "the upload never landed".
      await this.attachScreenshot('cv-list-before-refresh');
      await screen.pullToRefresh();
      const afterRefresh = await screen.getCvCount();
      this.logMessage(`CV count after refresh: ${afterRefresh}`);
      await this.attachText(
        `ADO #28140 evidence\nbefore=${before}\n` +
          `without refresh=${afterNoRefresh}\nafter refresh=${afterRefresh}`,
      );

      expect(
        afterRefresh > before,
        `The CV never appeared, even after a refresh (before=${before}, after=${afterRefresh}). ` +
          `That is an upload failure, not the stale-list defect in #28140.`,
      ).toBe(true);

      throw new Error(
        `ADO #28140 reproduced: the uploaded CV only appeared after a manual refresh ` +
          `(before=${before}, without refresh=${afterNoRefresh}, after refresh=${afterRefresh}).`,
      );
    }

    expect(afterNoRefresh, 'Expected the CV list to grow by one without a refresh.').toBeGreaterThan(
      before,
    );
  },
);
