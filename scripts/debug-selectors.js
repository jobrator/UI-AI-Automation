const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://jobrator.com/login', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('initial url', page.url());
  const buttons = await page.locator('button').allTextContents();
  console.log('buttons', buttons);
  await page.locator('button:has-text("Candidate")').click();
  await page.waitForTimeout(5000);
  console.log('after click url', page.url());
  const inputs = await page.locator('input').evaluateAll((els) => els.map((e) => ({
    name: e.getAttribute('name'),
    type: e.getAttribute('type'),
    placeholder: e.getAttribute('placeholder'),
    outer: e.outerHTML.slice(0, 200)
  })));
  console.log('inputs', JSON.stringify(inputs, null, 2));
  const anchors = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).map((a) => ({
      href: a.getAttribute('href'),
      text: a.innerText.trim().slice(0, 50),
      outer: a.outerHTML.slice(0, 200)
    }))
  );
  console.log('anchors', JSON.stringify(anchors, null, 2));
  await browser.close();
})();
