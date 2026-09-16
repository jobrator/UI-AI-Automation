/**
 * check-mobile-env.ts — preflight for the mobile suite.
 *
 * Verifies the things that make an Appium run fail with unhelpful errors:
 * the Appium server, an attached device, the automation driver, and the app
 * under test. Run before a device session:
 *
 *   npm run appium:doctor
 */
import { execSync } from 'child_process';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { MobileConfig } from '../config/mobile.config';

type Check = { name: string; ok: boolean; detail: string; fix?: string };

const results: Check[] = [];
const add = (name: string, ok: boolean, detail: string, fix?: string) =>
  results.push({ name, ok, detail, fix });

function sh(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

function get(url: string, timeoutMs = 4000): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ status: 0, body: '' });
    });
  });
}

(async () => {
  const cfg = MobileConfig.getInstance();
  const c = cfg.raw;

  console.log('\n═══ Jobrator mobile environment check ═══\n');

  // 1. Appium server
  const base = `http://${c.appiumHost}:${c.appiumPort}${c.appiumPath.replace(/\/$/, '')}`;
  const status = await get(`${base}/status`);
  add(
    'Appium server',
    status.status === 200,
    status.status === 200 ? `reachable at ${base}` : `no response from ${base}`,
    'Start it with `npx appium` (install: `npm i -g appium`).',
  );

  // 2. Automation driver
  if (status.status === 200) {
    const wanted = cfg.isAndroid ? 'uiautomator2' : 'xcuitest';
    const drivers = sh('appium driver list --installed 2>&1');
    const hasDriver = drivers.toLowerCase().includes(wanted);
    add(
      `Appium driver (${wanted})`,
      hasDriver,
      hasDriver ? 'installed' : `not found in \`appium driver list --installed\``,
      `appium driver install ${wanted}`,
    );
  }

  // 3. Device / emulator
  if (cfg.isAndroid) {
    const adb = sh('adb devices');
    const devices = adb
      .split('\n')
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l && l.endsWith('device'));
    add(
      'Android device',
      devices.length > 0,
      devices.length ? devices.join(', ') : 'no device from `adb devices`',
      'Start an emulator, or connect a device with USB debugging enabled.',
    );
  } else {
    const sim = sh('xcrun simctl list devices booted');
    const booted = sim.includes('Booted');
    add(
      'iOS simulator',
      booted,
      booted ? 'a simulator is booted' : 'no booted simulator from `xcrun simctl list devices booted`',
      'Boot one with `xcrun simctl boot "iPhone 15"` or open Simulator.app.',
    );
  }

  // 4. App under test
  try {
    cfg.assertAppConfigured();
    if (c.appPath) {
      const resolved = path.isAbsolute(c.appPath) ? c.appPath : path.resolve(process.cwd(), c.appPath);
      const exists = fs.existsSync(resolved);
      add('App binary', exists, exists ? resolved : `missing: ${resolved}`, 'Set MOBILE_APP_PATH.');
    } else {
      add(
        'App under test',
        true,
        cfg.isAndroid ? `${c.appPackage}/${c.appActivity}` : c.bundleId,
      );
    }
  } catch (e) {
    add('App under test', false, (e as Error).message.split('\n')[0], 'See src/mobile/README.md.');
  }

  // 5. CV fixture on device (only meaningful for Android + a live device)
  if (cfg.isAndroid) {
    const devicePath = process.env.MOBILE_CV_DEVICE_PATH || '/sdcard/Download/tc051-valid-cv.pdf';
    const ls = sh(`adb shell ls "${devicePath}" 2>&1`);
    const present = Boolean(ls) && !/No such file/i.test(ls);
    add(
      'CV fixture on device',
      present,
      present ? devicePath : `not found at ${devicePath}`,
      `adb push test-data/cv/tc051-valid-cv.pdf ${devicePath}`,
    );
  }

  // ── Report ────────────────────────────────────────────────────────────────
  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? '  PASS' : '  FAIL'}  ${r.name.padEnd(26)} ${r.detail}`);
    if (!r.ok) {
      failed++;
      if (r.fix) console.log(`        → fix: ${r.fix}`);
    }
  }

  console.log(
    `\n${results.length - failed}/${results.length} checks passed` +
      (failed ? ' — resolve the failures above before running `npm run test:mobile`.\n' : '\n'),
  );
  process.exit(failed ? 1 : 0);
})();
