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
  await page.waitForTimeout(4000);

  // Find all elements including divs with text "Success"
  const successElements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all
      .filter(el => el.children.length === 0 && /^Success$|^Declined$|^Bank Auth/i.test((el.textContent ?? '').trim()))
      .map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim(),
        class: el.className,
        id: el.id,
        hasClick: typeof (el as any).onclick === 'function',
        cursor: window.getComputedStyle(el).cursor
      }));
  });
  console.log('Success/Declined elements:', JSON.stringify(successElements, null, 2));

  // Click "Pay NGN 199" directly and see what happens (since the test card might be pre-loaded)
  console.log('\nClicking Pay NGN 199...');
  await page.locator('button:has-text("Pay NGN 199")').first().click();
  await page.waitForTimeout(5000);
  console.log('URL after Pay click:', page.url());
  console.log('Frames:', page.frames().map(f => f.url()));

  const bodyText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 1000);
  console.log('Body text:', bodyText);

  await browser.close();
})();
