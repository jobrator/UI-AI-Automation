import { chromium } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const { RegistrationPage } = await import('../pages/RegistrationPage');
  const { LoginPage } = await import('../pages/LoginPage');
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();

  const ts = Date.now();
  const email = `autotest+${ts}@mailinator.com`;
  const password = 'Test@1234!';
  console.log('Registering:', email);

  // Register
  const reg = new RegistrationPage(page);
  await reg.navigate();
  await reg.fillAllFields('AutoTest', 'Candidate', email, password);
  await reg.clickSubmit();
  await page.waitForTimeout(3000);
  console.log('Post-reg URL:', page.url());

  // Try to login
  const lp = new LoginPage(page);
  await lp.navigate();
  await lp.login(email, password);
  await page.waitForTimeout(5000);
  console.log('Post-login URL:', page.url());

  const bodyText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 300);
  console.log('Body:', bodyText);
  
  // Check if on dashboard or still login
  const isLoggedIn = /dashboard|jobs|home/i.test(page.url());
  console.log('Logged in successfully:', isLoggedIn);

  await browser.close();
})();
