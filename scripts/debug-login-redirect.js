const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://jobrator.com/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('button:has-text("Candidate")').click();
  await page.waitForTimeout(2000);
  await page.locator('input[name="email"]').fill('candidatejobrator+tosin@gmail.com');
  await page.locator('input[name="password"]').fill('Tester@12');
  await page.locator('button[type=submit]:has-text("Log In")').click();
  await page.waitForURL(/jobs|dashboard|home|profile/, { timeout: 60000 });
  console.log('logged in url', page.url());
  await page.goto('https://jobrator.com/login', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('after goto /login', page.url());
  console.log('title', await page.title());
  const text = await page.locator('body').innerText();
  console.log('body snippet', text.substring(0, 500));
  await browser.close();
})();
