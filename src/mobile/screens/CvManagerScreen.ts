import { BaseScreen } from './BaseScreen';
import { Locators } from '../lib/Locators';

/**
 * CvManagerScreen — More → CV Manager.
 *
 * Drives ADO #29943 (CV upload) and #28140 (uploaded CV not visible until the
 * screen is refreshed). The count helpers are what make #28140 assertable:
 * count before, upload, then count again WITHOUT pulling to refresh.
 */
export class CvManagerScreen extends BaseScreen {
  private readonly cvManagerButton = this.control('cv-manager-button', 'CV Manager');
  private readonly cvUploadButton = this.control('cv-upload-button', 'CV Upload');
  private readonly submitButton = this.control('cv-submit-button', 'Submit');
  private readonly successMessage = Locators.any(
    Locators.accessibilityId('cv-upload-success'),
    Locators.partialText('uploaded successfully'),
    Locators.partialText('Successful'),
    Locators.partialText('Success'),
  );

  /**
   * A row in the CV list. `cv-list-item` is the expected accessibility id;
   * the class fallbacks catch a list that has not been instrumented yet.
   */
  private readonly cvListItem = Locators.any(
    Locators.accessibilityId('cv-list-item'),
    this.cfg.isAndroid
      ? ['android=new UiSelector().resourceIdMatches(".*cv_item.*")']
      : ['//XCUIElementTypeCell'],
  );

  async isLoaded(): Promise<boolean> {
    return this.lib.isVisible(this.cvUploadButton, 10000);
  }

  async open(): Promise<void> {
    await this.lib.tap(this.cvManagerButton, 'CV Manager button');
  }

  async tapUpload(): Promise<void> {
    await this.lib.tap(this.cvUploadButton, 'CV Upload button');
  }

  /**
   * Select a document from the device.
   *
   * The OS document picker is outside the app's context, so this pushes the
   * file onto the device first and then picks it by name — that keeps the step
   * deterministic instead of depending on whatever happens to be in Downloads.
   */
  async selectDocument(deviceFilePath: string, displayName: string): Promise<void> {
    await this.lib.tapIfPresent(
      Locators.any(Locators.accessibilityId('file-picker-recent'), Locators.text('Recent')),
      'file picker Recent tab',
      4000,
    );
    const found = await this.lib.scrollTo(displayName);
    if (!found) {
      throw new Error(
        `Document "${displayName}" was not offered by the device file picker. ` +
          `Expected it at "${deviceFilePath}" — push it with ` +
          `\`adb push <local> ${deviceFilePath}\` (Android) before running, ` +
          `or set MOBILE_CV_DEVICE_PATH to a file that is already present.`,
      );
    }
    await this.lib.tap(Locators.partialText(displayName), `document "${displayName}"`);
  }

  async submit(): Promise<void> {
    await this.lib.tap(this.submitButton, 'Submit button');
  }

  async isUploadSuccessVisible(): Promise<boolean> {
    return this.lib.isVisible(this.successMessage, 20000);
  }

  /** Number of CV rows currently rendered — no refresh, no re-navigation. */
  async getCvCount(): Promise<number> {
    for (const selector of this.cvListItem) {
      try {
        // Spread into a plain array — $$ returns a chainable whose `length` is
        // itself a promise, which silently breaks numeric comparisons.
        const items = [...(await this.driver.$$(selector))];
        if (items.length > 0) return items.length;
      } catch {
        /* try the next candidate */
      }
    }
    return 0;
  }

  /** Pull-to-refresh, so #28140 can compare pre- and post-refresh state. */
  async pullToRefresh(): Promise<void> {
    const { width, height } = await this.driver.getWindowSize();
    await this.driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: Math.round(width / 2), y: Math.round(height * 0.3) },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 200 },
          { type: 'pointerMove', duration: 800, x: Math.round(width / 2), y: Math.round(height * 0.8) },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await this.driver.releaseActions().catch(() => {});
    await this.driver.pause(3000);
  }
}
