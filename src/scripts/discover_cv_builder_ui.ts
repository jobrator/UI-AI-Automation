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
  const lp = new LoginPage(page);
  await lp.navigate();
  await lp.login(env.candidateEmail, env.candidatePassword);
  await page.waitForURL(/dashboard|jobs|home/i, { timeout: 30000 });
  await page.goto(`${site}/dashboard/create-own-cv`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Find the skills area
  const skillsInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, div[contenteditable], [class*="skill"]'));
    return inputs.map(el => ({
      tag: el.tagName,
      type: (el as HTMLInputElement).type ?? '',
      name: (el as HTMLInputElement).name ?? '',
      id: el.id,
      className: el.className.substring(0, 80),
      placeholder: (el as HTMLInputElement).placeholder ?? '',
      isVisible: el.getBoundingClientRect().width > 0
    })).filter(e => e.name?.includes('skill') || e.className?.includes('skill') || e.id?.includes('skill') || e.placeholder?.toLowerCase().includes('skill'));
  });
  console.log('=== SKILLS RELATED ELEMENTS ===');
  skillsInfo.forEach(e => console.log(JSON.stringify(e)));

  // Find ALL visible inputs on the page (not hidden)
  const visibleInputs = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), textarea'));
    return all.map(el => ({
      tag: el.tagName,
      type: (el as HTMLInputElement).type,
      name: (el as HTMLInputElement).name,
      id: el.id,
      placeholder: (el as HTMLInputElement).placeholder,
      className: el.className.substring(0, 60)
    }));
  });
  console.log('\n=== VISIBLE INPUTS ===');
  visibleInputs.forEach(e => console.log(JSON.stringify(e)));

  // Click Generate via AI and observe what happens
  const genBtn = page.locator('button:has-text("Generate via AI")').first();
  if (await genBtn.isVisible().catch(() => false)) {
    console.log('\n=== CLICKING GENERATE VIA AI ===');
    await genBtn.click();
    await page.waitForTimeout(3000);
    // Check for swal2
    const swal = await page.locator('.swal2-container').isVisible().catch(() => false);
    console.log('SweetAlert2 visible:', swal);
    if (swal) {
      const swalText = await page.locator('.swal2-popup').textContent().catch(() => '');
      console.log('SweetAlert content:', swalText?.substring(0, 200));
      // Look for confirm button
      const confirmBtn = page.locator('.swal2-confirm, button:has-text("OK"), button:has-text("Confirm")').first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);
        console.log('Clicked SweetAlert confirm button');
      }
    }
    const descValue = await page.locator('textarea[name="experence.0.description"]').inputValue().catch(() => '');
    console.log('Experience desc value after AI:', descValue.substring(0, 100));
  }

  await browser.close();
})();
