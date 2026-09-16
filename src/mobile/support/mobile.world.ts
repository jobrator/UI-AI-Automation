import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { MobileLibrary } from '../lib/MobileLibrary';
import { MobileConfig, MobilePlatform } from '../config/mobile.config';

/**
 * MobileWorld — the Appium counterpart to CustomWorld.
 *
 * Carries the Appium session and cross-step state for one scenario. Kept
 * deliberately separate from the Playwright CustomWorld: the two runners share
 * feature-file conventions and reporting, not browser state.
 */
export class MobileWorld extends World {
  public driver!: WebdriverIO.Browser;
  public lib!: MobileLibrary;

  public platform: MobilePlatform;

  // ── Cross-step state ──────────────────────────────────────────────────────
  public scenarioName = '';
  public startTime = new Date();
  /** CV count captured before an upload, so #28140 can assert on the delta. */
  public cvCountBefore?: number;
  /** Credentials for a throwaway account, so shared .env creds are never mutated. */
  public throwawayEmail?: string;
  public throwawayPassword?: string;
  /** Original + replacement password, when a scenario changes it and must revert. */
  public originalPassword?: string;
  public newPassword?: string;

  constructor(options: IWorldOptions) {
    super(options);
    this.platform = MobileConfig.getInstance().platform;
  }

  public logMessage(message: string): void {
    console.log(`[MobileWorld][${this.platform}] ${message}`);
  }

  public async attachScreenshot(label = 'screenshot'): Promise<void> {
    try {
      await this.attach(await this.lib.screenshot(), 'image/png');
      this.logMessage(`Screenshot attached: ${label}`);
    } catch (err) {
      console.warn(`[MobileWorld] Could not take screenshot: ${(err as Error).message}`);
    }
  }

  public async attachText(text: string, mediaType = 'text/plain'): Promise<void> {
    await this.attach(text, mediaType);
  }
}

setWorldConstructor(MobileWorld);
