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

  await page.goto(`${site}/dashboard/cv-manager`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const links: Array<{ text: string; href: string }> = await page.evaluate(() =>
    (Array.from((document as Document).querySelectorAll('a, button')) as HTMLElement[]).map(el => ({
      text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').substring(0, 80),
      href: (el as HTMLAnchorElement).getAttribute('href') ?? ''
    })).filter(l => l.text || l.href)
  );
  console.log('=== CV MANAGER LINKS & BUTTONS ===');
  links.forEach(l => console.log(`  [${l.text}] → ${l.href}`));

  const bodyText = (await page.textContent('body') ?? '').split('\n')
    .map(l => l.trim())
    .filter(l => l && /ai|generate|build|create/i.test(l))
    .slice(0, 20);
  console.log('\n=== GENERATE/AI RELATED TEXT ===');
  bodyText.forEach(t => console.log(' ', t));

  console.log('\n=== PAGE URL ===', page.url());
  await browser.close();
})();
