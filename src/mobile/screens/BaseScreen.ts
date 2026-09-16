import { MobileLibrary } from '../lib/MobileLibrary';
import { Locators, Selector } from '../lib/Locators';
import { MobileConfig } from '../config/mobile.config';

/**
 * BaseScreen — abstract base for all mobile screen objects.
 *
 * Mirrors BasePage: screens expose intent-level actions, never assertions.
 * Assertions belong in step definitions so failures stay traceable.
 *
 * NOTE ON SELECTORS: the accessibility ids below are the framework's best guess
 * from the ADO repro steps — the Jobrator app binary was not available when this
 * was written. Each control therefore lists an accessibility-id candidate AND a
 * visible-text fallback. Confirm the real ids with Appium Inspector and trim the
 * fallbacks; see src/mobile/README.md.
 */
export abstract class BaseScreen {
  protected readonly driver: WebdriverIO.Browser;
  protected readonly lib: MobileLibrary;
  protected readonly cfg = MobileConfig.getInstance();

  constructor(driver: WebdriverIO.Browser) {
    this.driver = driver;
    this.lib = new MobileLibrary(driver);
  }

  /** True when this screen's primary content is on display. */
  abstract isLoaded(): Promise<boolean>;

  /**
   * Candidate selectors for a control: try the accessibility id first, then the
   * visible label. Keeps every screen's selector policy identical.
   */
  protected control(accessibilityId: string, visibleText?: string): Selector {
    return Locators.any(
      Locators.accessibilityId(accessibilityId),
      ...(visibleText ? [Locators.text(visibleText), Locators.partialText(visibleText)] : []),
    );
  }

  /** Tap the app's back control. */
  async goBack(): Promise<void> {
    if (this.cfg.isAndroid) {
      await this.driver.back();
      return;
    }
    await this.lib.tapIfPresent(
      Locators.any(Locators.accessibilityId('Back'), Locators.text('Back')),
      'Back',
    );
  }
}
