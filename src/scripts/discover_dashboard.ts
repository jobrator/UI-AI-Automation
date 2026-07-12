import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const site = (process.env.JOBRATOR_SITE ?? '').replace(/\/$/, '');
  const { LoginPage } = await import('../pages/LoginPage');
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();

  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.login(env.candidateEmail, env.candidatePassword);
  await page.waitForURL(/dashboard|jobs|home/i, { timeout: 30000 });

  await page.goto(`${site}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const links: Array<{ text: string; href: string }> = await page.evaluate(() =>
    (Array.from((document as Document).querySelectorAll('a')) as HTMLAnchorElement[]).map(a => ({
      text: (a.textContent ?? '').trim().replace(/\s+/g, ' ').substring(0, 80),
      href: a.getAttribute('href') ?? ''
    })).filter((l: { text: string; href: string }) => l.text || l.href)
  );

  console.log('=== DASHBOARD LINKS ===');
  links.forEach((l: { text: string; href: string }) => console.log(`  [${l.text}] → ${l.href}`));

  const bodyText = (await page.textContent('body') ?? '').split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l && /ai|generate|cv|resume/i.test(l))
    .slice(0, 30);
  console.log('\n=== AI/CV RELATED TEXT ===');
  bodyText.forEach((t: string) => console.log(' ', t));

  await browser.close();
})();
