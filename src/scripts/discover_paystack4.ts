import { Page } from 'playwright';
import { chromium } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
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
  const yesSure = page.locator('button:has-text("Yes, Sure!"), .swal2-confirm').first();
  if (await yesSure.isVisible()) await yesSure.click();
  await page.waitForURL(/checkout\.paystack\.com/i, { timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log('On Paystack:', page.url());

  // Find and click the Success option
  const successBtn = page.locator('button:has-text("Success"), [class*="success"], a:has-text("Success")').first();
  console.log('Success button visible:', await successBtn.isVisible().catch(() => false));
  
  // Try clicking the Success test option
  const allButtons = await page.locator('button').all();
  for (const btn of allButtons) {
    const txt = (await btn.textContent() ?? '').trim();
    console.log('Button:', txt);
  }
  
  // Also check for divs/spans that might be the test options
  const allClickable = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="button"], .button, button, a')).map(el => ({
      text: el.textContent?.trim().substring(0, 40),
      class: el.className.substring(0, 60),
      tag: el.tagName
    }))
  );
  console.log('\nAll clickable:', JSON.stringify(allClickable, null, 2));

  await browser.close();
})();
