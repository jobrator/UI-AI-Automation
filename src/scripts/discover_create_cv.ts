import { Page } from 'playwright';
import { chromium } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage();

  const { LoginPage } = await import('../pages/LoginPage');
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();
  const site = env.jobratorSite.replace(/\/$/, '');

  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.login(env.candidateEmail, env.candidatePassword);
  await page.waitForURL(/dashboard|jobs|home/i, { timeout: 30000 });

  await page.goto(`${site}/dashboard/create-own-cv`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const links: Array<{ text: string; href: string }> = await page.evaluate(() =>
    (Array.from((document as Document).querySelectorAll('a, button, input, textarea, select')) as HTMLElement[]).map(el => ({
      text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').substring(0, 80),
      href: (el as HTMLAnchorElement).getAttribute('href') ?? (el as HTMLInputElement).getAttribute('name') ?? (el as HTMLInputElement).getAttribute('placeholder') ?? ''
    })).filter(l => l.text || l.href)
  );
  console.log('=== CREATE CV PAGE ELEMENTS ===');
  links.forEach(l => console.log(`  [${l.text}] → ${l.href}`));

  const allText = (await page.textContent('body') ?? '').substring(0, 3000);
  console.log('\n=== PAGE TEXT (first 3000 chars) ===');
  console.log(allText);
  console.log('\n=== PAGE URL ===', page.url());
  await browser.close();
})();
