/**
 * subscribe_candidate.ts — one-off environment seeder.
 *
 * Puts the shared .env candidate account onto the Jobrator Plus plan using the
 * Paystack TEST "Success" card. Subscription is the single gate behind ~15
 * scenarios (apply-for-job, applied jobs, AI generation, messaging threads,
 * employer applicants/shortlist/interviews), so this must be seeded once before
 * those scenarios can assert real behaviour.
 *
 * Runs in real Chrome, headed, because checkout.paystack.com puts a Cloudflare
 * "verify you are human" interstitial in front of the test-card list which
 * headless Chromium never clears.
 *
 *   npx ts-node src/scripts/subscribe_candidate.ts
 */
import { chromium, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SHOT_DIR = path.resolve(process.cwd(), 'reports/subscribe');
const shot = async (page: Page, name: string) => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true }).catch(() => {});
};

/** Try to clear a Cloudflare Turnstile / interstitial by clicking its checkbox. */
async function tryClearCloudflare(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const body = ((await page.textContent('body').catch(() => '')) ?? '').toLowerCase();
    const gated = /verify you are human|verifying you are human|needs to review the security|just a moment/.test(body);
    const cardsVisible = await page.locator('.card').nth(1).isVisible().catch(() => false);
    if (cardsVisible) return;
    if (!gated && attempt > 2) return;

    // Turnstile renders inside a cross-origin iframe; click its checkbox.
    for (const frame of page.frames()) {
      if (!/challenges\.cloudflare\.com|turnstile/i.test(frame.url())) continue;
      const box = frame.locator('input[type="checkbox"], label, .cb-lb').first();
      if (await box.isVisible().catch(() => false)) {
        await box.click({ timeout: 3000 }).catch(() => {});
        console.log('   [cf] clicked turnstile checkbox');
      }
    }
    await page.waitForTimeout(2500);
  }
}

(async () => {
  const { LoginPage } = await import('../pages/LoginPage');
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();
  const site = env.jobratorSite.replace(/\/$/, '');

  const email = process.env.SUB_EMAIL || env.candidateEmail;
  const password = process.env.SUB_PASSWORD || env.candidatePassword;

  const profileDir = path.resolve(process.cwd(), 'reports/.chrome-profile-subscribe');
  let ctx: BrowserContext;
  try {
    ctx = await chromium.launchPersistentContext(profileDir, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1440, height: 960 },
      args: ['--disable-blink-features=AutomationControlled'],
    });
  } catch (e) {
    console.log('   real Chrome unavailable, falling back to bundled Chromium:', (e as Error).message);
    ctx = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: { width: 1440, height: 960 },
    });
  }
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  page.on('response', (r) => {
    if (/api\.jobrator\.com.*(subscription|payment|verify)/i.test(r.url())) {
      console.log(`   [api] ${r.status()} ${r.request().method()} ${r.url()}`);
    }
  });

  console.log(`\n[1] Logging in as ${email}`);
  const lp = new LoginPage(page);
  await lp.navigate();
  await lp.login(email, password);
  await page.waitForURL(/dashboard|jobs|home/i, { timeout: 60000 }).catch(() => {});
  console.log(`    → ${page.url()}`);

  console.log('[2] Checking current subscription status');
  await page.goto(`${site}/dashboard/subscription-history`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const before = ((await page.textContent('body')) ?? '').replace(/\s+/g, ' ');
  const activeBefore = /Active plan[\s\S]{0,120}?(Jobrator|Plus|Premium|Basic)/i.test(before);
  console.log(`    already subscribed: ${activeBefore}`);
  if (activeBefore) {
    console.log('    Nothing to do — account already has an active plan.');
    await shot(page, 'already-subscribed');
    await ctx.close();
    return;
  }

  console.log('[3] Opening /subscription');
  await page.goto(`${site}/subscription`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await shot(page, '01-subscription-page');

  const subscribe = page
    .locator('a:has-text("Subscribe Now"), button:has-text("Subscribe Now"), button:has-text("Subscribe"), a:has-text("Subscribe")')
    .filter({ visible: true })
    .first();
  if (!(await subscribe.isVisible().catch(() => false))) {
    console.log('    No Subscribe control found. Page controls:');
    console.log('   ', JSON.stringify(await page.locator('a:visible, button:visible').evaluateAll((els) =>
      els.map((e) => (e.textContent || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 40))));
    await ctx.close();
    process.exit(1);
  }
  await subscribe.click();
  await page.waitForTimeout(2000);

  const confirm = page.locator('.swal2-confirm, button:has-text("Yes, Sure!"), button:has-text("Yes")').first();
  if (await confirm.isVisible().catch(() => false)) {
    console.log('[4] Confirming the "Are you sure?" dialog');
    await confirm.click();
  }

  console.log('[5] Waiting for Paystack checkout');
  await page.waitForURL(/checkout\.paystack\.com/i, { timeout: 45000 }).catch(() => {});
  console.log(`    → ${page.url()}`);
  if (!/paystack/i.test(page.url())) {
    await shot(page, '02-no-paystack');
    console.log('    Never reached Paystack — aborting.');
    await ctx.close();
    process.exit(1);
  }
  await page.waitForTimeout(4000);
  await shot(page, '02-paystack-landing');

  console.log('[6] Clearing any Cloudflare interstitial');
  await tryClearCloudflare(page);
  await shot(page, '03-paystack-after-cf');

  const successCard = page.locator('.card').nth(1);
  if (!(await successCard.isVisible().catch(() => false))) {
    console.log('    Test-card list never rendered. Visible text:');
    console.log('   ', ((await page.textContent('body')) ?? '').replace(/\s+/g, ' ').slice(0, 500));
    await shot(page, '04-no-test-cards');
    await ctx.close();
    process.exit(1);
  }
  console.log(`[7] Test card: "${((await successCard.textContent()) ?? '').trim()}"`);
  await successCard.click({ force: true });
  await page.waitForTimeout(1000);

  const payBtn = page.locator('[data-testid="testCardsPaymentButton"], button:has-text("Pay NGN")').first();
  await payBtn.waitFor({ state: 'visible', timeout: 15000 });
  console.log('[8] Paying with the Success test card');
  await payBtn.click({ force: true });

  await page.waitForTimeout(4000);
  for (const label of ['PIN', 'OTP']) {
    const field = page.locator(`input[placeholder*="${label}" i], input[name*="${label}" i]`).first();
    if (await field.isVisible().catch(() => false)) {
      console.log(`    ${label} step — entering test value`);
      await field.fill(label === 'PIN' ? '0000' : '123456');
      await page.locator('button:has-text("Authorize"), button:has-text("Submit"), button[type="submit"]')
        .first().click().catch(() => {});
      await page.waitForTimeout(4000);
    }
  }

  console.log('[9] Waiting for redirect back to Jobrator');
  await page.waitForURL((u) => /jobrator\.com/i.test(u.toString()), { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);
  console.log(`    → ${page.url()}`);
  await shot(page, '05-post-payment');

  console.log('[10] Verifying the plan is now active');
  await page.goto(`${site}/dashboard/subscription-history`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const after = ((await page.textContent('body')) ?? '').replace(/\s+/g, ' ');
  console.log('    subscription-history:', after.slice(after.indexOf('Active plan'), after.indexOf('Active plan') + 400));
  await shot(page, '06-subscription-history');

  console.log('[11] Re-checking the Apply control on a job detail page');
  await page.goto(`${site}/jobs`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.locator('.job-block h4 a').first().click().catch(() => {});
  await page.waitForTimeout(4000);
  const applyEls = await page.locator('a:has-text("Apply"), button:has-text("Apply")').evaluateAll((els) =>
    els.map((e) => ({ tag: e.tagName, text: (e.textContent || '').trim(), href: e.getAttribute('href') })));
  console.log('    apply controls:', JSON.stringify(applyEls));
  await shot(page, '07-job-detail-apply');

  console.log('\nDone.');
  await ctx.close();
})().catch(async (e) => {
  console.error('SUBSCRIBE FAILED', e);
  process.exit(1);
});
