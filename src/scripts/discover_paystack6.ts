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

  // Find the parent of the "Success" span and inspect hierarchy
  const parentInfo = await page.evaluate(() => {
    const span = Array.from(document.querySelectorAll('.card__number')).find(el => el.textContent?.trim() === 'Success');
    if (!span) return null;
    let el: Element | null = span;
    const chain = [];
    for (let i = 0; i < 6; i++) {
      if (!el) break;
      chain.push({
        tag: el.tagName,
        class: (el as HTMLElement).className.substring(0, 80),
        cursor: window.getComputedStyle(el as HTMLElement).cursor,
        role: el.getAttribute('role')
      });
      el = el.parentElement;
    }
    return chain;
  });
  console.log('Parent chain of Success span:', JSON.stringify(parentInfo, null, 2));

  // Try clicking the parent card container
  const successCard = page.locator('.card__number:has-text("Success")').locator('..');
  const parentVisible = await successCard.isVisible().catch(() => false);
  console.log('Parent visible:', parentVisible);

  // Try various parent approaches
  const cardContainer = page.locator('div:has(.card__number:has-text("Success"))').first();
  console.log('Card container count:', await cardContainer.count());
  if (await cardContainer.isVisible().catch(() => false)) {
    console.log('Card container class:', await cardContainer.getAttribute('class'));
    await cardContainer.click({ force: true });
    await page.waitForTimeout(2000);
    // Check if Pay button is now enabled
    const payBtnDisabled = await page.locator('button:has-text("Pay NGN 199")').first().isDisabled().catch(() => true);
    console.log('Pay button still disabled after click:', payBtnDisabled);
  }

  await page.waitForTimeout(3000);
  await browser.close();
})();
