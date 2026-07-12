import { Page } from 'playwright';
import { chromium } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
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
  await page.goto(`${site}/dashboard/subscription-history`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('Subscription page URL:', page.url());

  const bodyText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 2000);
  console.log('Page text:', bodyText);

  const links: Array<{text:string;href:string}> = await page.evaluate(() =>
    (Array.from(document.querySelectorAll('a, button')) as HTMLElement[]).map(el => ({
      text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').substring(0, 60),
      href: (el as HTMLAnchorElement).getAttribute('href') ?? ''
    })).filter(l => l.text)
  );
  console.log('\nLinks/buttons:', JSON.stringify(links, null, 2));

  // Also check the pricing/subscription page
  await page.goto(`${site}/subscription`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('\nPricing page URL:', page.url());
  const pricingText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 2000);
  console.log('Pricing text:', pricingText);

  await page.waitForTimeout(3000);
  await browser.close();
})();
