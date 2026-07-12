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
  
  // Wait for Paystack redirect
  await page.waitForURL(/checkout\.paystack\.com/i, { timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log('Paystack URL:', page.url());

  // Get all inputs on the Paystack page
  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input, button, select')).map(el => ({
      tag: el.tagName,
      type: (el as HTMLInputElement).type,
      name: (el as HTMLInputElement).name,
      id: el.id,
      placeholder: (el as HTMLInputElement).placeholder,
      value: (el as HTMLInputElement).value?.substring(0, 30),
      text: el.textContent?.trim().substring(0, 40),
      className: el.className.substring(0, 60)
    }))
  );
  console.log('\nPaystack page inputs/buttons:');
  inputs.forEach(i => console.log(JSON.stringify(i)));

  const bodyText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 1500);
  console.log('\nPage text:', bodyText);

  await page.waitForTimeout(5000);
  await browser.close();
})();
