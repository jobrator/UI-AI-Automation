import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const CANDIDATE_EMAIL = process.env.CANDIDATE_EMAIL || '';
const CANDIDATE_PASSWORD = process.env.CANDIDATE_PASSWORD || '';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://jobrator.com/login');
  await page.waitForLoadState('domcontentloaded');
  
  const candidateBtn = page.locator('button:has-text("Candidate")');
  if (await candidateBtn.isVisible()) await candidateBtn.click();
  
  await page.locator('input[type="email"]').fill(CANDIDATE_EMAIL);
  await page.locator('input[type="password"]').fill(CANDIDATE_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|home|profile|jobs|application/, { timeout: 30000 });
  
  await page.goto('https://jobrator.com/dashboard/cv-manager');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  
  const formHtml = await page.evaluate(() => {
    const form = document.querySelector('form');
    return form ? form.outerHTML.substring(0, 8000) : 'No form found';
  });
  console.log('FORM HTML:\n', formHtml);
  
  const cardHtml = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.card, [class*="resume"], [class*="cv"]'));
    return all.slice(0, 5).map((el: Element) => (el as HTMLElement).outerHTML.substring(0, 500)).join('\n---\n');
  });
  console.log('\nCARD HTML:\n', cardHtml);
  
  await browser.close();
})().catch(err => console.error((err as Error).message));
