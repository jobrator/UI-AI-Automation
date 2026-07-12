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

  await page.goto(`${site}/subscription`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.locator('a:has-text("Subscribe Now"), button:has-text("Subscribe Now")').first().click();
  await page.waitForTimeout(2000);
  const yesSure = page.locator('.swal2-confirm, button:has-text("Yes, Sure!")').first();
  if (await yesSure.isVisible()) await yesSure.click();
  await page.waitForURL(/checkout\.paystack\.com/i, { timeout: 20000 });
  await page.waitForTimeout(4000);

  // Click Success card
  const successContainer = page.locator('div:has(.card__number:has-text("Success"))').first();
  await successContainer.click({ force: true });
  await page.waitForTimeout(1000);

  // Click Pay
  await page.locator('[data-testid="testCardsPaymentButton"], button:has-text("Pay NGN 199")').first().click({ force: true });
  await page.waitForTimeout(3000);

  // Check current state
  console.log('URL after Pay:', page.url());
  const bodyText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 500);
  console.log('Body text after Pay:', bodyText);

  // Take screenshot
  await page.screenshot({ path: '/tmp/paystack_after_pay.png', fullPage: false });
  console.log('Screenshot saved to /tmp/paystack_after_pay.png');

  // Wait longer
  await page.waitForTimeout(10000);
  console.log('URL after 10s wait:', page.url());
  const bodyText2 = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 500);
  console.log('Body text after 10s:', bodyText2);
  await page.screenshot({ path: '/tmp/paystack_after_10s.png', fullPage: false });

  await browser.close();
})();
