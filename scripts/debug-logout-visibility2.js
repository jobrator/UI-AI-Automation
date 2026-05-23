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
  await page.goto('https://jobrator.com/login', { waitUntil: 'networkidle', timeout: 60000 });
  const visibleLogout = page.locator('a[href="/login#"]');
  console.log('/login# count', await visibleLogout.count());
  console.log('/login# isVisible', await visibleLogout.isVisible().catch(e=>`error:${e.message}`));
  console.log('/login# outer', await visibleLogout.evaluateAll(nodes=>nodes.map(n=>n.outerHTML)));
  await browser.close();
})();
