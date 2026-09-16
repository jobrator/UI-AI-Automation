# Mobile (Appium) test suite

Appium/WebdriverIO harness for the Jobrator **mobile app**, added because the
Sprint 54 bugs #29941–#29947 and #28140 were filed against the mobile app and the
existing Playwright suite is web-only — those bugs could only be retested against
their web equivalents, which does not clear a mobile-specific defect.

It reuses the suite's conventions (Cucumber BDD, page/screen objects, tagged
hooks, `.env` config) so it reads like the web suite rather than a second
framework bolted on.

---

## Status — read this first

**These scenarios have never been executed against a real build.** The Jobrator
app binary was not available when the harness was written. Two consequences:

1. **The accessibility ids are educated guesses**, derived from the wording of
   the ADO repro steps. Every control therefore declares *several* candidate
   selectors — an accessibility id first, then a visible-text fallback — and
   `MobileLibrary.resolve()` uses the first that exists on the device. The suite
   is designed to survive the ids being wrong, not to prove they are right.
2. **Expect a first-run calibration pass.** Point Appium Inspector at the app,
   confirm the real ids, and trim each screen object down to the single correct
   selector. That work is confined to `src/mobile/screens/` — steps and features
   should not need to change.

What *is* verified: the harness compiles clean (`tsc --noEmit`) and all 12
scenarios / 114 steps resolve (`npm run test:mobile:dryrun`).

---

## Prerequisites

| Requirement | Install |
|---|---|
| Appium 2.x server | `npm i -g appium` then `appium` |
| Android driver | `appium driver install uiautomator2` |
| iOS driver | `appium driver install xcuitest` |
| Android SDK / `adb` | Android Studio, or `brew install --cask android-platform-tools` |
| Xcode + Simulator (iOS) | App Store |
| A device or emulator | `adb devices` / `xcrun simctl list devices booted` |
| The Jobrator app build | `.apk` (Android) or `.app`/`.ipa` (iOS) |

Verify everything at once:

```bash
npm run appium:doctor
```

It checks the Appium server, the driver, an attached device, the configured app,
and the CV fixture — and prints a `→ fix:` line for anything missing.

---

## Configuration

Copy the mobile block from `.env.example` into `.env` and fill it in. The app
under test can be supplied **either** as a binary **or** as an already-installed
package:

```bash
# Option A — install a binary each run
MOBILE_APP_PATH=./builds/jobrator-staging.apk

# Option B — launch a build already on the device
ANDROID_APP_PACKAGE=com.jobrator.app
ANDROID_APP_ACTIVITY=com.jobrator.app.MainActivity
```

Credentials are **not** duplicated — the mobile suite reads `CANDIDATE_EMAIL`,
`CANDIDATE_PASSWORD`, `EMPLOYER_EMAIL` and `EMPLOYER_PASSWORD` from the same
`.env` the web suite uses. The repro steps' `"valid_email"` / `"valid_password"`
placeholders resolve to those values at run time.

The CV-upload scenarios need the fixture on the device:

```bash
adb push test-data/cv/tc051-valid-cv.pdf /sdcard/Download/tc051-valid-cv.pdf
```

---

## Running

```bash
npm run appium:doctor        # preflight
npm run test:mobile:dryrun   # verify every step resolves — no device needed
npm run test:mobile          # run on the configured platform
npm run test:mobile:android
npm run test:mobile:ios

# a single bug
npx cucumber-js --config cucumber.js --profile mobile --tags "@ADO-29941"
```

Reports land in `reports/mobile/`. On failure the hooks attach a screenshot and
dump the full XML page source to `reports/mobile/<scenario>.pagesource.xml` —
that dump is the fastest way to find a control's real accessibility id.

---

## Coverage — Sprint 54 bugs

| ADO | Scenario | Feature file |
|---|---|---|
| #29941 | Verify Candidate Can Login from My Job Screen | `candidate_auth.mobile.feature` |
| #29945 | Invalid-credential modal on wrong password | `candidate_auth.mobile.feature` |
| #29947 | Employer cannot login with malformed credentials | `employer_auth.mobile.feature` |
| #29943 | Verify Candidate CV Upload | `cv_manager.mobile.feature` |
| #28140 | Uploaded CV appears without refreshing | `cv_manager.mobile.feature` |
| #29942 | Verify Candidate Can Edit Profile | `candidate_profile.mobile.feature` |
| #29944 | Verify Candidate Can Change Password | `change_password.mobile.feature` |
| #29946 | Verify Employer Can Edit Profile | `company_profile.mobile.feature` |

Scenarios are tagged `@ADO-<id>` so a run maps straight back to the board.

---

## Layout

```
src/mobile/
  config/mobile.config.ts     Env-driven Appium capabilities (singleton, mirrors EnvConfig)
  lib/Locators.ts             Platform-aware selector builders (Android UiSelector / iOS predicate)
  lib/MobileLibrary.ts        Gestures, waits, candidate-selector resolution (mirrors CommonLibrary)
  support/mobile.world.ts     MobileWorld — carries the Appium session per scenario
  hooks/mobile.hooks.ts       Session lifecycle + tagged login hooks
  screens/                    Screen objects (no assertions — those live in steps)
  steps/                      Step definitions, worded to match the ADO repro steps
  scripts/check-mobile-env.ts Preflight checker
features/mobile/              Feature files
```

### Design notes

- **Separate world from the web suite.** The `mobile` Cucumber profile loads only
  `src/mobile/**`; it never loads the Playwright `CustomWorld`. The two suites
  share conventions and reporting, not browser state.
- **Screens hold no assertions**, matching `BasePage`'s contract — a failed
  expectation is always traceable to a step.
- **`@requires-throwaway-candidate` registers over the web.** The change-password
  repro ends by reverting the password; a mid-scenario failure would otherwise
  strand the shared `.env` account on a temporary password. The hook registers a
  throwaway account through the existing web registration flow, then signs into
  the app as that account. The shared credentials are never mutated.
- **Parallelism is 1 by default.** Appium serves one session per device; raise
  `MOBILE_PARALLEL` only when you have that many devices attached.
