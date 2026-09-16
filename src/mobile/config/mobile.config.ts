import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export type MobilePlatform = 'Android' | 'iOS';

export interface MobileConfiguration {
  platform: MobilePlatform;

  // Appium server
  appiumHost: string;
  appiumPort: number;
  appiumPath: string;

  // Device
  deviceName: string;
  platformVersion: string;
  udid: string;

  // App under test — either a binary path, or an already-installed app id
  appPath: string;
  appPackage: string;   // Android
  appActivity: string;  // Android
  bundleId: string;     // iOS

  // Behaviour
  noReset: boolean;
  fullReset: boolean;
  newCommandTimeout: number;
  defaultTimeout: number;
}

/**
 * MobileConfig — singleton mirroring EnvConfig, but for the Appium/mobile stack.
 *
 * Everything is environment-driven so the same specs run against a local
 * emulator, a physical device, or a device cloud without code changes.
 */
export class MobileConfig {
  private static instance: MobileConfig;
  private readonly _config: MobileConfiguration;

  private constructor() {
    const platform = ((process.env.MOBILE_PLATFORM || 'Android') as MobilePlatform);

    this._config = {
      platform,

      appiumHost: process.env.APPIUM_HOST || '127.0.0.1',
      appiumPort: parseInt(process.env.APPIUM_PORT || '4723', 10),
      appiumPath: process.env.APPIUM_PATH || '/',

      deviceName:
        process.env.MOBILE_DEVICE_NAME ||
        (platform === 'Android' ? 'Android Emulator' : 'iPhone 15'),
      platformVersion: process.env.MOBILE_PLATFORM_VERSION || '',
      udid: process.env.MOBILE_UDID || '',

      appPath: process.env.MOBILE_APP_PATH || '',
      appPackage: process.env.ANDROID_APP_PACKAGE || '',
      appActivity: process.env.ANDROID_APP_ACTIVITY || '',
      bundleId: process.env.IOS_BUNDLE_ID || '',

      noReset: process.env.MOBILE_NO_RESET === 'true',
      fullReset: process.env.MOBILE_FULL_RESET === 'true',
      newCommandTimeout: parseInt(process.env.MOBILE_NEW_COMMAND_TIMEOUT || '240', 10),
      defaultTimeout: parseInt(process.env.MOBILE_DEFAULT_TIMEOUT || '20000', 10),
    };
  }

  static getInstance(): MobileConfig {
    if (!MobileConfig.instance) MobileConfig.instance = new MobileConfig();
    return MobileConfig.instance;
  }

  get platform(): MobilePlatform { return this._config.platform; }
  get isAndroid(): boolean { return this._config.platform === 'Android'; }
  get isIOS(): boolean { return this._config.platform === 'iOS'; }
  get defaultTimeout(): number { return this._config.defaultTimeout; }
  get raw(): MobileConfiguration { return this._config; }

  /** WebdriverIO connection options for the Appium server. */
  get connection() {
    const c = this._config;
    return {
      hostname: c.appiumHost,
      port: c.appiumPort,
      path: c.appiumPath,
      connectionRetryTimeout: 120000,
      connectionRetryCount: 2,
      logLevel: (process.env.APPIUM_LOG_LEVEL || 'error') as
        'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent',
    };
  }

  /**
   * W3C capabilities for the session. Uses `appium:app` when a binary path is
   * given, otherwise falls back to launching an already-installed app by
   * package/bundle id — which is what you want on a device cloud or when the
   * build is pre-installed on the device.
   */
  get capabilities(): Record<string, unknown> {
    const c = this._config;
    const caps: Record<string, unknown> = {
      platformName: c.platform,
      'appium:automationName': c.platform === 'Android' ? 'UiAutomator2' : 'XCUITest',
      'appium:deviceName': c.deviceName,
      'appium:noReset': c.noReset,
      'appium:fullReset': c.fullReset,
      'appium:newCommandTimeout': c.newCommandTimeout,
      'appium:autoGrantPermissions': c.platform === 'Android' ? true : undefined,
      'appium:autoAcceptAlerts': c.platform === 'iOS' ? true : undefined,
    };

    if (c.platformVersion) caps['appium:platformVersion'] = c.platformVersion;
    if (c.udid) caps['appium:udid'] = c.udid;

    if (c.appPath) {
      const resolved = path.isAbsolute(c.appPath)
        ? c.appPath
        : path.resolve(process.cwd(), c.appPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(
          `MOBILE_APP_PATH points at "${resolved}", which does not exist. ` +
            `Set MOBILE_APP_PATH to the .apk/.app/.ipa under test, or leave it empty ` +
            `and set ANDROID_APP_PACKAGE/ANDROID_APP_ACTIVITY (or IOS_BUNDLE_ID) ` +
            `to launch an already-installed build.`,
        );
      }
      caps['appium:app'] = resolved;
    }

    if (c.platform === 'Android') {
      if (c.appPackage) caps['appium:appPackage'] = c.appPackage;
      if (c.appActivity) caps['appium:appActivity'] = c.appActivity;
    } else if (c.bundleId) {
      caps['appium:bundleId'] = c.bundleId;
    }

    // Strip undefined so Appium does not reject the payload
    for (const k of Object.keys(caps)) if (caps[k] === undefined) delete caps[k];
    return caps;
  }

  /**
   * Fail fast with an actionable message when the app under test has not been
   * configured at all — otherwise Appium throws a much less obvious error.
   */
  assertAppConfigured(): void {
    const c = this._config;
    const hasBinary = Boolean(c.appPath);
    const hasInstalled = c.platform === 'Android'
      ? Boolean(c.appPackage && c.appActivity)
      : Boolean(c.bundleId);

    if (!hasBinary && !hasInstalled) {
      throw new Error(
        'No app under test configured. Set MOBILE_APP_PATH to the Jobrator ' +
          '.apk/.app/.ipa, or set ANDROID_APP_PACKAGE + ANDROID_APP_ACTIVITY ' +
          '(Android) / IOS_BUNDLE_ID (iOS) for a pre-installed build. ' +
          'See src/mobile/README.md.',
      );
    }
  }
}
