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

  // Click Subscribe Now
  await page.locator('a:has-text("Subscribe Now"), button:has-text("Subscribe Now")').first().click();
  await page.waitForTimeout(2000);

  // Click "Yes, Sure!" on the confirmation modal
  const yesSure = page.locator('button:has-text("Yes, Sure!"), .swal2-confirm').first();
  if (await yesSure.isVisible()) {
    console.log('Clicking Yes, Sure!');
    await yesSure.click();
    await page.waitForTimeout(4000);
  }

  const url = page.url();
  console.log('URL after Yes, Sure!:', url);
  console.log('Frames:', page.frames().map(f => f.url()));
  console.log('Pages:', page.context().pages().length);

  // Wait for Paystack to load
  await page.waitForTimeout(3000);
  console.log('URL after wait:', page.url());
  const frames = page.frames();
  console.log('Frames after wait:', frames.map(f => f.url()));

  // Check for Paystack in DOM
  const paystackInDOM = await page.evaluate(() => {
    return {
      hasPaystackClass: !!document.querySelector('[class*="paystack"], [id*="paystack"]'),
      iframeCount: document.querySelectorAll('iframe').length,
      iframeSrcs: Array.from(document.querySelectorAll('iframe')).map(f => f.src)
    };
  });
  console.log('Paystack in DOM:', JSON.stringify(paystackInDOM));

  // Look for any modal/popup
  const modalText = await page.locator('.swal2-popup, .modal, [role="dialog"]').textContent().catch(() => 'none');
  console.log('Modal text:', modalText?.substring(0, 200));

  await page.waitForTimeout(10000);
  console.log('Final URL:', page.url());
  console.log('Final DOM iframe count:', (await page.evaluate(() => document.querySelectorAll('iframe').length)));

  await browser.close();
})();
