import { MobileConfig } from '../config/mobile.config';

/**
 * Locators — platform-aware selector builders.
 *
 * Every builder returns an ORDERED LIST of candidate WebdriverIO selectors,
 * most specific first. MobileLibrary tries each in turn and uses the first that
 * resolves. That matters here because the Jobrator app's accessibility ids are
 * not yet confirmed: a screen can name its best guess plus a visible-text
 * fallback, and the step keeps working whichever one the build actually ships.
 *
 * Once the real ids are confirmed with Appium Inspector, prefer
 * `Locators.accessibilityId(...)` alone — it is the fastest and least brittle.
 */

const esc = (v: string) => v.replace(/"/g, '\\"');

export type Selector = string[];

export const Locators = {
  /** Accessibility id / content-desc (Android) or name (iOS). Preferred. */
  accessibilityId(id: string): Selector {
    return [`~${id}`];
  },

  /** Exact visible text. */
  text(value: string): Selector {
    const v = esc(value);
    return MobileConfig.getInstance().isAndroid
      ? [
          `android=new UiSelector().text("${v}")`,
          `android=new UiSelector().description("${v}")`,
          `//*[@text="${v}" or @content-desc="${v}"]`,
        ]
      : [
          `-ios predicate string:label == "${v}" OR name == "${v}" OR value == "${v}"`,
          `//*[@label="${v}" or @name="${v}"]`,
        ];
  },

  /** Substring of the visible text — use for labels that carry dynamic content. */
  partialText(value: string): Selector {
    const v = esc(value);
    return MobileConfig.getInstance().isAndroid
      ? [
          `android=new UiSelector().textContains("${v}")`,
          `android=new UiSelector().descriptionContains("${v}")`,
          `//*[contains(@text,"${v}") or contains(@content-desc,"${v}")]`,
        ]
      : [
          `-ios predicate string:label CONTAINS "${v}" OR name CONTAINS "${v}" OR value CONTAINS "${v}"`,
          `//*[contains(@label,"${v}") or contains(@name,"${v}")]`,
        ];
  },

  /** Android resource-id (suffix match, so the package prefix is optional). */
  resourceId(id: string): Selector {
    const v = esc(id);
    return MobileConfig.getInstance().isAndroid
      ? [
          `android=new UiSelector().resourceIdMatches(".*${v}$")`,
          `//*[contains(@resource-id,"${v}")]`,
        ]
      : [`~${id}`];
  },

  /** A native input field, optionally the nth one on screen (0-based). */
  input(index?: number): Selector {
    const isAndroid = MobileConfig.getInstance().isAndroid;
    const cls = isAndroid ? 'android.widget.EditText' : 'XCUIElementTypeTextField';
    if (index === undefined) return [isAndroid ? `android=new UiSelector().className("${cls}")` : `//${cls}`];
    return isAndroid
      ? [`android=new UiSelector().className("${cls}").instance(${index})`, `(//${cls})[${index + 1}]`]
      : [`(//${cls})[${index + 1}]`, `(//XCUIElementTypeSecureTextField)[${index + 1}]`];
  },

  /** A secure/password input field. */
  secureInput(index = 0): Selector {
    return MobileConfig.getInstance().isAndroid
      ? [
          `android=new UiSelector().className("android.widget.EditText").instance(${index})`,
          `(//android.widget.EditText)[${index + 1}]`,
        ]
      : [`(//XCUIElementTypeSecureTextField)[${index + 1}]`];
  },

  /** Build one flat candidate list from several builders. */
  any(...selectors: Selector[]): Selector {
    return selectors.flat();
  },
};
