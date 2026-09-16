import { Selector } from './Locators';
import { MobileConfig } from '../config/mobile.config';

type Driver = WebdriverIO.Browser;
type Element = WebdriverIO.Element;

/**
 * MobileLibrary — the mobile counterpart to CommonLibrary.
 *
 * All screen objects and steps go through this class rather than calling the
 * driver directly, so waiting, candidate-selector resolution, scrolling and
 * logging behave identically everywhere.
 *
 * The central idea is `resolve()`: a screen declares several candidate
 * selectors for a control and the first one that actually exists on the device
 * wins. That keeps the suite runnable while the app's accessibility ids are
 * still being confirmed, and collapses to a single fast lookup once they are.
 */
export class MobileLibrary {
  private readonly driver: Driver;
  private readonly cfg = MobileConfig.getInstance();

  constructor(driver: Driver) {
    this.driver = driver;
  }

  private log(msg: string): void {
    console.log(`[Mobile] ${msg}`);
  }

  /** First candidate selector that resolves to an existing element, or null. */
  async resolve(candidates: Selector, timeout = this.cfg.defaultTimeout): Promise<Element | null> {
    const deadline = Date.now() + timeout;
    let lastError = '';

    do {
      for (const selector of candidates) {
        try {
          const el = await this.driver.$(selector);
          if (await el.isExisting()) return el as unknown as Element;
        } catch (e) {
          lastError = (e as Error).message;
        }
      }
      await this.driver.pause(400);
    } while (Date.now() < deadline);

    if (lastError) this.log(`resolve failed (last error: ${lastError.slice(0, 120)})`);
    return null;
  }

  /** Resolve or throw with a message naming the control and every selector tried. */
  async require(candidates: Selector, label: string, timeout?: number): Promise<Element> {
    const el = await this.resolve(candidates, timeout);
    if (!el) {
      throw new Error(
        `Could not find "${label}" on the ${this.cfg.platform} app. Selectors tried:\n` +
          candidates.map((c) => `  - ${c}`).join('\n') +
          `\nIf the app has changed, update the screen object rather than the step.`,
      );
    }
    return el;
  }

  async waitForVisible(candidates: Selector, label: string, timeout?: number): Promise<Element> {
    const el = await this.require(candidates, label, timeout);
    await el.waitForDisplayed({ timeout: timeout ?? this.cfg.defaultTimeout });
    return el;
  }

  async isVisible(candidates: Selector, timeout = 5000): Promise<boolean> {
    const el = await this.resolve(candidates, timeout);
    if (!el) return false;
    return el.isDisplayed().catch(() => false);
  }

  async tap(candidates: Selector, label: string): Promise<void> {
    const el = await this.waitForVisible(candidates, label);
    await el.click();
    this.log(`tap → ${label}`);
  }

  /** Tap only if present; returns whether it was tapped. For optional prompts. */
  async tapIfPresent(candidates: Selector, label: string, timeout = 5000): Promise<boolean> {
    const el = await this.resolve(candidates, timeout);
    if (!el || !(await el.isDisplayed().catch(() => false))) return false;
    await el.click().catch(() => {});
    this.log(`tap (optional) → ${label}`);
    return true;
  }

  async type(candidates: Selector, value: string, label: string): Promise<void> {
    const el = await this.waitForVisible(candidates, label);
    await el.clearValue().catch(() => {});
    await el.setValue(value);
    this.log(`type → ${label} = "${/password/i.test(label) ? '***' : value}"`);
    await this.hideKeyboard();
  }

  async getText(candidates: Selector, label: string): Promise<string> {
    const el = await this.waitForVisible(candidates, label);
    return (await el.getText().catch(() => '')) ?? '';
  }

  /** Whole-screen text, used for assertions that just need "is this word here". */
  async pageText(): Promise<string> {
    const source = await this.driver.getPageSource().catch(() => '');
    return source
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async hideKeyboard(): Promise<void> {
    try {
      if (await this.driver.isKeyboardShown()) await this.driver.hideKeyboard();
    } catch {
      /* keyboard APIs are flaky across drivers — never fail a step on this */
    }
  }

  /** Scroll down until the given text is on screen. */
  async scrollTo(text: string, maxSwipes = 8): Promise<boolean> {
    for (let i = 0; i < maxSwipes; i++) {
      const { Locators } = await import('./Locators');
      if (await this.isVisible(Locators.partialText(text), 1200)) return true;
      await this.swipeUp();
    }
    const { Locators } = await import('./Locators');
    return this.isVisible(Locators.partialText(text), 1200);
  }

  async swipeUp(): Promise<void> {
    const { width, height } = await this.driver.getWindowSize();
    await this.driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: Math.round(width / 2), y: Math.round(height * 0.75) },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 200 },
          { type: 'pointerMove', duration: 600, x: Math.round(width / 2), y: Math.round(height * 0.25) },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await this.driver.releaseActions().catch(() => {});
  }

  /**
   * Dismiss a confirmation dialog by tapping whichever affirmative control the
   * build actually renders.
   */
  async confirmDialog(labels = ['OK', 'Ok', 'Okay', 'Done', 'Continue', 'Yes']): Promise<boolean> {
    const { Locators } = await import('./Locators');
    for (const label of labels) {
      if (await this.tapIfPresent(Locators.any(Locators.accessibilityId(label), Locators.text(label)), label, 2500)) {
        return true;
      }
    }
    return false;
  }

  async screenshot(): Promise<Buffer> {
    const b64 = await this.driver.takeScreenshot();
    return Buffer.from(b64, 'base64');
  }
}
