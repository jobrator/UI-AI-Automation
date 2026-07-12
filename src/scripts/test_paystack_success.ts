import { Page } from 'playwright';
import { chromium } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
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
  const yesSure = page.locator('.swal2-confirm, button:has-text("Yes, Sure!")').first();
  if (await yesSure.isVisible()) await yesSure.click();
  await page.waitForURL(/checkout\.paystack\.com/i, { timeout: 20000 });
  await page.waitForTimeout(4000);
  console.log('On Paystack:', page.url());

  // Click the "Success" test card (index 1 among .card elements)
  const successCard = page.locator('.card').nth(1);
  console.log('Success card text:', await successCard.textContent());
  await successCard.click({ force: true });
  await page.waitForTimeout(1000);

  const payBtn = page.locator('[data-testid="testCardsPaymentButton"]').first();
  console.log('Pay button disabled:', await payBtn.isDisabled().catch(() => 'unknown'));

  // Click Pay
  await payBtn.click({ force: false });
  console.log('Clicked Pay');

  // Wait for redirect back to Jobrator
  try {
    await page.waitForURL(/jobrator\.com/i, { timeout: 30000 });
    console.log('Redirected back to Jobrator! URL:', page.url());
  } catch (e) {
    console.log('No Jobrator redirect. URL:', page.url());
    await page.screenshot({ path: '/tmp/paystack_stuck.png' });
    const bt = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 400);
    console.log('Body:', bt);
  }

  await page.waitForTimeout(5000);
  console.log('Final URL:', page.url());
  const finalText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 400);
  console.log('Final text:', finalText);

  // Check subscription status
  if (/jobrator\.com/i.test(page.url())) {
    await page.goto(`${site}/dashboard/subscription-history`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const subText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ');
    console.log('\nSubscription history:', subText.substring(0, 500));

    // Now test AI generation
    await page.goto(`${site}/dashboard/create-own-cv`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Generate via AI")').first().click();
    await page.waitForTimeout(3000);
    const swal = await page.locator('.swal2-container').isVisible().catch(() => false);
    console.log('SweetAlert shown after Generate via AI:', swal);
    if (swal) {
      const st = await page.locator('.swal2-popup').textContent().catch(() => '');
      console.log('SweetAlert text:', st?.substring(0, 100));
    } else {
      const desc = await page.locator('textarea[name="experence.0.description"]').inputValue().catch(() => '');
      console.log('Description populated:', desc.substring(0, 200));
    }
  }

  await browser.close();
})();
