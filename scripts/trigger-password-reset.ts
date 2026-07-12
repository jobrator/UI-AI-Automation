/**
 * Trigger forgot-password email for candidate+tosin@gmail.com
 * then leave the browser open so you can complete the reset manually.
 * Run with: npx ts-node scripts/trigger-password-reset.ts
 */

import { chromium } from 'playwright';

const CANDIDATE_EMAIL = 'candidate+tosin@gmail.com';
const SITE_URL = 'https://jobrator.com';

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  console.log(`Navigating to ${SITE_URL}/forget-password...`);
  await page.goto(`${SITE_URL}/forget-password`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  if (!(await emailInput.isVisible({ timeout: 8000 }).catch(() => false))) {
    console.log('⚠️  Could not find email input. URL:', page.url());
    await page.screenshot({ path: 'scripts/forgot-pw-page.png' });
    return; // Leave browser open
  }

  await emailInput.fill(CANDIDATE_EMAIL);
  console.log(`Entered email: ${CANDIDATE_EMAIL}`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  const bodyText = await page.locator('body').textContent().catch(() => '');
  const hasSent = /sent|email|check/i.test(bodyText ?? '');
  console.log(`\nSubmitted. Response contains "sent/email/check": ${hasSent}`);
  console.log(`Current URL: ${page.url()}`);

  console.log(`
==========================================================
NEXT STEPS (do these manually):
1. Check Gmail for ${CANDIDATE_EMAIL}
   (+ aliases deliver to your main Gmail inbox)
2. Open the Jobrator password reset email
3. Click the reset link — it will open in the browser
4. Set the new password to: Tester@12
==========================================================
Browser will stay open for 5 minutes. Close it when done.
`);

  // Keep browser alive for 5 minutes
  await page.waitForTimeout(5 * 60 * 1000);
  await browser.close();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
