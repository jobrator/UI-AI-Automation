import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const EMAIL = process.env.CANDIDATE_EMAIL || '';
const PASSWORD = process.env.CANDIDATE_PASSWORD || '';
const DOCX = path.resolve(process.cwd(), 'test-data', 'cv', 'tc052-valid-cv.docx');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://jobrator.com/login');
  await page.waitForLoadState('domcontentloaded');
  const candidateBtn = page.locator('button:has-text("Candidate")');
  if (await candidateBtn.isVisible()) await candidateBtn.click();
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|home|profile|jobs|application/, { timeout: 30000 });

  await page.goto('https://jobrator.com/dashboard/cv-manager');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Set the docx file via the hidden input
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(DOCX);
  await page.evaluate(() => {
    const i = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (i) { i.dispatchEvent(new Event('change', { bubbles: true })); i.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await page.waitForTimeout(500);

  // Fill title
  const title = page.locator('input[placeholder="Enter Title"], input[placeholder*="title" i]').first();
  if (await title.isVisible().catch(() => false)) await title.fill('AutoTest CV DOCX');

  // Submit
  await page.waitForFunction(() => {
    const b = document.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    return b && !b.disabled;
  }, { timeout: 5000 }).catch(() => console.log('submit never enabled'));
  await page.locator('button[type="submit"]').first().click().catch(() => console.log('submit click failed'));

  await page.waitForTimeout(3000);

  // Report the swal popup
  const swal = await page.evaluate(() => {
    const p = document.querySelector('.swal2-popup');
    if (!p) return null;
    return {
      classes: p.className,
      hasSuccessIcon: !!document.querySelector('.swal2-icon-success, .swal2-success'),
      hasErrorIcon: !!document.querySelector('.swal2-icon-error, .swal2-error'),
      title: (document.querySelector('.swal2-title') as HTMLElement | null)?.innerText ?? '',
      text: (document.querySelector('.swal2-html-container') as HTMLElement | null)?.innerText ?? '',
    };
  });
  console.log('SWAL POPUP:', JSON.stringify(swal, null, 2));

  // Dismiss popup and check the list
  await page.locator('.swal2-confirm').first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const cvCount = await page.locator('div.file-edit-box').count();
  console.log('CV LIST ITEMS:', cvCount);

  await browser.close();
})().catch(err => console.error('PROBE ERROR:', (err as Error).message));
