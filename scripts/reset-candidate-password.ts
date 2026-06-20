/**
 * One-shot script: Trigger password reset for candidate+tosin@gmail.com
 * Then follow the reset link to set it back to Tester@12.
 *
 * Since the admin panel doesn't expose candidate user passwords,
 * this script uses the site's own forgot-password flow.
 *
 * Run with: npx ts-node scripts/reset-candidate-password.ts
 */

import { chromium } from 'playwright';

const CANDIDATE_EMAIL = 'candidate+tosin@gmail.com';
const TARGET_PASSWORD = 'Tester@12';
const SITE_URL = 'https://jobrator.com';

async function loginAsCandidate(page: any, password: string): Promise<boolean> {
  await page.goto(`${SITE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const candidateTab = page.locator('button:has-text("Candidate")').first();
  if (await candidateTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await candidateTab.click();
    await page.waitForTimeout(500);
  }

  const emailField = page.locator('input[name="email"], input[type="email"]').first();
  if (!(await emailField.isVisible({ timeout: 8000 }).catch(() => false))) return false;

  await emailField.fill(CANDIDATE_EMAIL);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);

  const checkbox = page.locator('input[name="checkbox-ready"], #checkbox-ready').first();
  if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (!(await checkbox.isChecked())) await checkbox.check();
  }

  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  return /dashboard/i.test(page.url());
}

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  // ── 1. Check if password already works ────────────────────────────────────
  console.log('Step 1: Checking if Tester@12 still works...');
  const works = await loginAsCandidate(page, TARGET_PASSWORD);
  if (works) {
    console.log('✅ Password is already Tester@12 — nothing to do.');
    await browser.close();
    return;
  }
  console.log(`  Current password is not Tester@12. Triggering forgot-password flow...`);

  // ── 2. Navigate to the forgot password page ────────────────────────────────
  console.log('\nStep 2: Navigating to forgot password page...');
  await page.goto(`${SITE_URL}/forget-password`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scripts/forgot-pw-page.png' });
  console.log(`  URL: ${page.url()}`);

  // ── 3. Enter the email and submit ──────────────────────────────────────────
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  if (!(await emailInput.isVisible({ timeout: 8000 }).catch(() => false))) {
    console.log('⚠️  Email input not visible on forgot-password page. Screenshot: scripts/forgot-pw-page.png');
    await browser.close();
    return;
  }

  await emailInput.fill(CANDIDATE_EMAIL);
  console.log(`  Entered email: ${CANDIDATE_EMAIL}`);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scripts/forgot-pw-submitted.png' });
  console.log(`  Submitted. URL: ${page.url()}`);

  const successMsg = await page.locator(
    '.alert-success, .success-message, *:has-text("email"), *:has-text("sent"), *:has-text("check")'
  ).first().textContent({ timeout: 5000 }).catch(() => '');
  console.log(`  Response: "${successMsg?.trim()}"`);

  // ── 4. Wait for user to paste the reset link ───────────────────────────────
  console.log('\n==========================================================');
  console.log('ACTION REQUIRED:');
  console.log(`1. Check Gmail inbox for ${CANDIDATE_EMAIL}`);
  console.log('2. Open the password reset email from Jobrator');
  console.log('3. Paste the reset link URL below and press Enter');
  console.log('==========================================================\n');

  // Read reset link from stdin
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const resetLink = await new Promise<string>(resolve => {
    rl.question('Paste reset link URL: ', answer => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!resetLink || !resetLink.startsWith('http')) {
    console.log('⚠️  No valid link provided. Exiting.');
    await browser.close();
    return;
  }

  // ── 5. Navigate to the reset link and set new password ────────────────────
  console.log(`\nStep 3: Navigating to reset link...`);
  await page.goto(resetLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scripts/reset-link-page.png' });
  console.log(`  URL: ${page.url()}`);

  const newPwdField = page.locator('input[name="password"], input[type="password"]').first();
  if (!(await newPwdField.isVisible({ timeout: 8000 }).catch(() => false))) {
    console.log('⚠️  No password field on reset page. Screenshot: scripts/reset-link-page.png');
    await browser.close();
    return;
  }

  await newPwdField.fill(TARGET_PASSWORD);
  const confirmField = page.locator('input[name="password_confirmation"], input[name="confirm_password"]').last();
  if (await confirmField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmField.fill(TARGET_PASSWORD);
  }

  const submitBtn = page.locator('button[type="submit"], button:has-text("Reset"), button:has-text("Save"), button:has-text("Submit")').first();
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
  } else {
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(3000);
  console.log(`  After reset submit: ${page.url()}`);
  await page.screenshot({ path: 'scripts/reset-done.png' });

  // ── 6. Verify ──────────────────────────────────────────────────────────────
  console.log('\nStep 4: Verifying...');
  const verified = await loginAsCandidate(page, TARGET_PASSWORD);
  if (verified) {
    console.log(`✅ Password restored! ${CANDIDATE_EMAIL} → ${TARGET_PASSWORD}`);
  } else {
    console.log('❌ Verification failed. Check the screenshots.');
    await page.screenshot({ path: 'scripts/verify-fail.png' });
  }

  await browser.close();
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
