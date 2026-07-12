import { Page } from 'playwright';
import { chromium } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const page: Page = await browser.newPage();
  const { RegistrationPage } = await import('../pages/RegistrationPage');
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();

  const ts = Date.now();
  const email = `autotest+${ts}@mailinator.com`;
  const password = 'Test@1234!';

  const reg = new RegistrationPage(page);
  await reg.navigate();
  await reg.fillAllFields('AutoTest', 'Candidate', email, password);
  await reg.clickSubmit();
  await page.waitForTimeout(4000);

  console.log('Post-registration URL:', page.url());
  const bodyText = (await page.textContent('body') ?? '').replace(/\s+/g, ' ').substring(0, 400);
  console.log('Body text:', bodyText);
  await page.screenshot({ path: '/tmp/post_registration.png' });

  await browser.close();
})();
