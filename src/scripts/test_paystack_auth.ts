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

  // Get all .card elements and check their text
  const cards = await page.evaluate(() => {
    const cardEls = Array.from(document.querySelectorAll('.card'));
    return cardEls.map((c, i) => ({
      index: i,
      text: c.textContent?.replace(/\s+/g, ' ').trim().substring(0, 60),
      class: (c as HTMLElement).className
    }));
  });
  console.log('Cards found:', JSON.stringify(cards, null, 2));

  // Click the first .card (which should be "Success")
  const firstCard = page.locator('.card').first();
  await firstCard.click({ force: true });
  await page.waitForTimeout(1000);
  console.log('Clicked first .card');

  const payBtn = page.locator('[data-testid="testCardsPaymentButton"]').first();
  console.log('Pay button disabled:', await payBtn.isDisabled().catch(() => 'unknown'));

  // Click Pay
  await payBtn.click({ force: true });
  await page.waitForTimeout(3000);

  // Screenshot
  await page.screenshot({ path: '/tmp/paystack_step2.png', fullPage: false });
  const bodyText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 300);
  console.log('Body after pay:', bodyText);

  // If there's an Authenticate or OTP step
  const authBtn = page.locator('button:has-text("Authenticate")').first();
  if (await authBtn.isVisible().catch(() => false)) {
    await authBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/paystack_otp.png', fullPage: false });
    console.log('Clicked Authenticate. Body:', (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 300));
  }

  // Check for OTP input
  const otpInput = page.locator('input[name="otp"], input[placeholder*="otp" i], input[placeholder*="code" i]').first();
  if (await otpInput.isVisible().catch(() => false)) {
    await otpInput.fill('123456');
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(5000);
  }

  await page.waitForTimeout(5000);
  console.log('Final URL:', page.url());
  await page.screenshot({ path: '/tmp/paystack_final.png', fullPage: false });

  await browser.close();
})();
