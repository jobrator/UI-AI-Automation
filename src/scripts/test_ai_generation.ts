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

  // Already subscribed — go directly to CV builder
  await page.goto(`${site}/dashboard/create-own-cv`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click Generate via AI
  await page.locator('button:has-text("Generate via AI")').first().click();
  await page.waitForTimeout(2000);

  // SweetAlert modal - inspect its contents
  const swalVisible = await page.locator('.swal2-container').isVisible().catch(() => false);
  console.log('SweetAlert visible:', swalVisible);
  if (swalVisible) {
    const swalText = await page.locator('.swal2-popup').textContent().catch(() => '');
    console.log('SweetAlert text:', swalText?.substring(0, 200));

    // Look for inputs in the swal
    const swalInputs = await page.evaluate(() => {
      const popup = document.querySelector('.swal2-popup');
      if (!popup) return [];
      return Array.from(popup.querySelectorAll('input, textarea, button')).map(el => ({
        tag: el.tagName,
        type: (el as HTMLInputElement).type,
        name: (el as HTMLInputElement).name,
        placeholder: (el as HTMLInputElement).placeholder,
        text: el.textContent?.trim(),
        class: el.className.substring(0, 40)
      }));
    });
    console.log('SweetAlert inputs/buttons:', JSON.stringify(swalInputs, null, 2));

    // Fill in the experience points input if there is one
    const swalInput = page.locator('.swal2-popup textarea, .swal2-popup input:not([type="hidden"])').first();
    if (await swalInput.isVisible().catch(() => false)) {
      await swalInput.fill('Built REST APIs, led team of 5, reduced deployment time by 40%');
      console.log('Filled in experience points');
    }

    // Click Generate button
    const generateBtn = page.locator('.swal2-popup button:has-text("Generate"), .swal2-confirm').first();
    if (await generateBtn.isVisible().catch(() => false)) {
      await generateBtn.click();
      console.log('Clicked Generate');
      await page.waitForTimeout(5000);
    }

    // Check if another modal appears or description is filled
    const swalStillVisible = await page.locator('.swal2-container').isVisible().catch(() => false);
    console.log('SweetAlert still visible:', swalStillVisible);
    if (swalStillVisible) {
      const newText = await page.locator('.swal2-popup').textContent().catch(() => '');
      console.log('New SweetAlert text:', newText?.substring(0, 300));
    }

    // Check description textarea
    const descValue = await page.locator('textarea[name="experence.0.description"]').inputValue().catch(() => '');
    console.log('Description value:', descValue.substring(0, 300));
  }

  // Now test Write via AI
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("Write via AI")').first().click();
  await page.waitForTimeout(2000);
  const swal2 = await page.locator('.swal2-container').isVisible().catch(() => false);
  console.log('\nWrite via AI SweetAlert:', swal2);
  if (swal2) {
    const txt = await page.locator('.swal2-popup').textContent().catch(() => '');
    console.log('Write via AI modal text:', txt?.substring(0, 200));

    const swalInputs = await page.evaluate(() => {
      const popup = document.querySelector('.swal2-popup');
      if (!popup) return [];
      return Array.from(popup.querySelectorAll('input, textarea, button')).map(el => ({
        tag: el.tagName, type: (el as HTMLInputElement).type, placeholder: (el as HTMLInputElement).placeholder, text: el.textContent?.trim()
      }));
    });
    console.log('Write via AI inputs:', JSON.stringify(swalInputs, null, 2));
  }

  await page.waitForTimeout(3000);
  await browser.close();
})();
