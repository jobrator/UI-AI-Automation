import { Page } from 'playwright';
import { chromium } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page: Page = await browser.newPage();
  const { LoginPage } = await import('../pages/LoginPage');
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();
  const site = env.jobratorSite.replace(/\/$/, '');
  const lp = new LoginPage(page);
  await lp.navigate();
  await lp.login(env.candidateEmail, env.candidatePassword);
  await page.waitForURL(/dashboard|jobs|home/i, { timeout: 30000 });

  // Go to subscription page
  await page.goto(`${site}/subscription`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  // Click Subscribe Now
  await page.locator('a:has-text("Subscribe Now"), button:has-text("Subscribe Now")').first().click();
  await page.waitForTimeout(2000);

  // Confirm with "Yes, Sure!"
  const yesSure = page.locator('.swal2-confirm, button:has-text("Yes, Sure!")').first();
  if (await yesSure.isVisible()) {
    console.log('Clicking Yes Sure!');
    await yesSure.click();
  }

  // Wait for Paystack
  await page.waitForURL(/checkout\.paystack\.com/i, { timeout: 20000 });
  await page.waitForTimeout(4000);
  console.log('Paystack URL:', page.url());

  // Click the "Success" card container (enables the Pay button)
  const successContainer = page.locator('div:has(.card__number:has-text("Success"))').first();
  await successContainer.click({ force: true });
  await page.waitForTimeout(1000);

  // Click Pay NGN 199
  const payBtn = page.locator('[data-testid="testCardsPaymentButton"], button:has-text("Pay NGN 199")').first();
  const isDisabled = await payBtn.isDisabled().catch(() => true);
  console.log('Pay button disabled:', isDisabled);
  await payBtn.click({ force: !isDisabled });
  console.log('Clicked Pay button');

  // Wait for redirect back to Jobrator
  await page.waitForURL(/jobrator\.com/i, { timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('Post-payment URL:', page.url());

  const bodyText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 500);
  console.log('Post-payment page text:', bodyText);

  // Now try AI generation
  await page.goto(`${site}/dashboard/create-own-cv`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const genBtn = page.locator('button:has-text("Generate via AI")').first();
  console.log('Generate via AI visible:', await genBtn.isVisible());
  await genBtn.click();
  await page.waitForTimeout(3000);

  // Check if SweetAlert (subscription required) still appears
  const swal = await page.locator('.swal2-container').isVisible().catch(() => false);
  console.log('SweetAlert after click:', swal);
  if (swal) {
    const swalText = await page.locator('.swal2-popup').textContent().catch(() => '');
    console.log('SweetAlert text:', swalText?.substring(0, 100));
  }

  // Check description textarea
  const descValue = await page.locator('textarea[name="experence.0.description"]').inputValue().catch(() => 'not found');
  console.log('Experience description:', descValue.substring(0, 200));

  await page.waitForTimeout(5000);
  await browser.close();
})();
