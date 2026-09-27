/**
 * TC019 — OWASP A07 — Brute-force protection retest (v2)
 *
 * Improvements over src/scripts/tc019_manual_retest.ts:
 *  - Uses LoginPage.login(), which ticks the hidden `checkbox-ready` input.
 *    Without it the form is blocked client-side and the request never reaches
 *    the server, so the old script's "5 attempts" proved nothing.
 *  - Captures the actual auth HTTP request/response (status + body) per attempt,
 *    so 429 / 423 / rate-limit headers are detected even with no UI change.
 *  - Finishes with a correct-password login to determine whether the account
 *    was actually locked (the definitive account-lockout check).
 */
import { chromium, Page, Response } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface AuthCall {
  attempt: number;
  url: string;
  status: number;
  statusText: string;
  body: string;
  rateLimitHeaders: Record<string, string>;
}

(async () => {
  const { LoginPage } = await import('../pages/LoginPage');
  const { EnvConfig } = await import('../config/env.config');

  const env = EnvConfig.getInstance();
  const email: string = env.candidateEmail;
  const goodPassword: string = env.candidatePassword;
  const wrongPassword = 'DefinitelyWrong@123';
  const ATTEMPTS = 5;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  let currentAttempt = 0;
  const authCalls: AuthCall[] = [];

  page.on('response', async (res: Response) => {
    const url = res.url();
    if (!/login|signin|auth|token|account/i.test(url)) return;
    if (res.request().method() === 'GET' && !/login|auth|token/i.test(url)) return;
    if (res.request().method() !== 'POST' && res.status() < 400) return;

    let body = '';
    try {
      body = (await res.text()).replace(/\s+/g, ' ').slice(0, 400);
    } catch {
      body = '<unreadable>';
    }
    const headers = res.headers();
    const rateLimitHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (/ratelimit|retry-after|x-rate|cf-|captcha/i.test(k)) rateLimitHeaders[k] = String(v);
    }
    authCalls.push({
      attempt: currentAttempt,
      url,
      status: res.status(),
      statusText: res.statusText(),
      body,
      rateLimitHeaders,
    });
  });

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(' TC019 — Brute-force protection retest (v2)');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(` Target : ${process.env.JOBRATOR_SITE}/login`);
  console.log(` Account: ${email}`);
  console.log(` Date   : ${new Date().toISOString()}`);

  const lp = new LoginPage(page);
  await lp.navigate();

  for (let i = 1; i <= ATTEMPTS; i++) {
    currentAttempt = i;
    const t0 = Date.now();
    await lp.login(email, wrongPassword);
    await page.waitForTimeout(2000);
    const elapsed = Date.now() - t0;

    const errorText = (await lp.getErrorMessage()).trim().replace(/\s+/g, ' ');
    const captcha = await lp.isCaptchaVisible();
    const calls = authCalls.filter(c => c.attempt === i);

    console.log(`\n─── Attempt ${i}/${ATTEMPTS} ──────────────────────────────`);
    console.log(`  URL now        : ${page.url()}`);
    console.log(`  Response time  : ${elapsed} ms`);
    console.log(`  Error message  : "${errorText.slice(0, 160)}"`);
    console.log(`  CAPTCHA visible: ${captcha}`);
    if (calls.length === 0) {
      console.log(`  HTTP           : (no auth request observed — form may not have submitted)`);
    }
    for (const c of calls) {
      console.log(`  HTTP           : ${c.status} ${c.statusText} ${c.url}`);
      console.log(`     body        : ${c.body.slice(0, 200)}`);
      if (Object.keys(c.rateLimitHeaders).length) {
        console.log(`     rate hdrs   : ${JSON.stringify(c.rateLimitHeaders)}`);
      }
    }
  }

  // ── 6th attempt: is the form still accepting submissions at all? ──────────
  currentAttempt = 6;
  console.log(`\n─── Attempt 6 (past the 5-attempt threshold) ───────────────`);
  await lp.login(email, wrongPassword);
  await page.waitForTimeout(2000);
  const sixthError = (await lp.getErrorMessage()).trim().replace(/\s+/g, ' ');
  const sixthCaptcha = await lp.isCaptchaVisible();
  const sixthCalls = authCalls.filter(c => c.attempt === 6);
  console.log(`  Error message  : "${sixthError.slice(0, 160)}"`);
  console.log(`  CAPTCHA visible: ${sixthCaptcha}`);
  for (const c of sixthCalls) {
    console.log(`  HTTP           : ${c.status} ${c.statusText} ${c.url}`);
    console.log(`     body        : ${c.body.slice(0, 200)}`);
  }

  await page.screenshot({
    path: path.resolve(process.cwd(), 'reports/tc019_retest_v2_after_failures.png'),
    fullPage: true,
  });

  // ── Definitive lockout check: correct password after 6 failures ───────────
  currentAttempt = 7;
  console.log(`\n─── Lockout check: logging in with the CORRECT password ────`);
  await lp.login(email, goodPassword);
  await page.waitForTimeout(4000);
  const finalUrl = page.url();
  const loggedIn = await lp.isUserMenuVisible();
  const lockoutError = (await lp.getErrorMessage()).trim().replace(/\s+/g, ' ');
  const finalCalls = authCalls.filter(c => c.attempt === 7);
  console.log(`  URL now        : ${finalUrl}`);
  console.log(`  Logged in      : ${loggedIn}`);
  console.log(`  Error message  : "${lockoutError.slice(0, 160)}"`);
  for (const c of finalCalls) {
    console.log(`  HTTP           : ${c.status} ${c.statusText} ${c.url}`);
    console.log(`     body        : ${c.body.slice(0, 200)}`);
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  const anyThrottleStatus = authCalls.some(c => c.status === 429 || c.status === 423);
  const anyRateHeaders = authCalls.some(c =>
    Object.keys(c.rateLimitHeaders).some(k => /ratelimit|retry-after/i.test(k)),
  );
  const anyCaptcha = sixthCaptcha;
  const lockoutWording = /lock|block|too many|attempt|captcha|suspend|temporar/i.test(
    sixthError + ' ' + lockoutError,
  );
  const correctPwdRejected = !loggedIn;

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(' EVIDENCE SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Auth requests observed        : ${authCalls.length}`);
  console.log(`  Any HTTP 429/423 throttle     : ${anyThrottleStatus}`);
  console.log(`  Any RateLimit/Retry-After hdr : ${anyRateHeaders}`);
  console.log(`  CAPTCHA after 5+ failures     : ${anyCaptcha}`);
  console.log(`  Lockout wording in UI         : ${lockoutWording}`);
  console.log(`  Correct password rejected     : ${correctPwdRejected}`);

  const fixed =
    anyThrottleStatus || anyRateHeaders || anyCaptcha || lockoutWording || correctPwdRejected;

  console.log('\n=== VERDICT ===');
  console.log(
    fixed
      ? 'PASS — brute-force protection IS enforced. Bug appears FIXED.'
      : 'FAIL — no lockout, no CAPTCHA, no rate limiting after 6 failed attempts, ' +
          'and the correct password still logs in immediately. Bug is NOT fixed.',
  );

  await page.screenshot({
    path: path.resolve(process.cwd(), 'reports/tc019_retest_v2_final.png'),
    fullPage: true,
  });

  await browser.close();
})();
