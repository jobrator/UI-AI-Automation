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
  const subscribeBtn = page.locator('a:has-text("Subscribe Now"), button:has-text("Subscribe Now"), button:has-text("Subscribe")').first();
  console.log('Subscribe button visible:', await subscribeBtn.isVisible());
  await subscribeBtn.click();
  await page.waitForTimeout(3000);

  // Check what happened after click — look for Paystack iframe or new page
  const url = page.url();
  console.log('URL after Subscribe click:', url);

  // Check for Paystack iframe
  const paystackFrame = page.frameLocator('iframe[src*="paystack"], iframe[name*="paystack"]');
  const iframes = page.frames();
  console.log('Frames count:', iframes.length);
  iframes.forEach(f => console.log(' Frame URL:', f.url()));

  // Check if there's a popup/new window
  const allPages = page.context().pages();
  console.log('Pages count:', allPages.length);

  // Check for inline Paystack container
  const paystackEl = await page.locator('[class*="paystack"], [id*="paystack"], .pay-button').all();
  console.log('Paystack elements:', paystackEl.length);

  const bodyText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 1000);
  console.log('Page text after click:', bodyText);

  await page.waitForTimeout(5000);
  console.log('Final URL:', page.url());
  console.log('Final frames:', page.frames().map(f => f.url()));

  await browser.close();
})();
