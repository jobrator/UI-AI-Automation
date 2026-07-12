/**
 * probe-messages.ts
 * Logs DOM info from the messages page and dashboard header to discover the right selectors.
 * Run: ts-node src/scripts/probe-messages.ts
 */
import { chromium } from 'playwright';
import { EnvConfig } from '../config/env.config';

const env = EnvConfig.getInstance();

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // ── Login ────────────────────────────────────────────────────────────────
  console.log('Logging in as candidate...');
  await page.goto(`${env.jobratorSite}login`, { waitUntil: 'domcontentloaded' });

  const candidateTab = page.locator('button:has-text("Candidate"), [data-tab="candidate"]').first();
  if (await candidateTab.isVisible().catch(() => false)) {
    await candidateTab.click();
    await page.waitForTimeout(500);
  }

  const checkbox = page.locator('input[name="checkbox-ready"], #checkbox-ready');
  if (await checkbox.isVisible().catch(() => false) && !await checkbox.isChecked()) {
    await checkbox.check();
  }

  await page.locator('input[name="email"], input[type="email"]').first().fill(env.candidateEmail);
  await page.locator('input[name="password"], input[type="password"]').first().fill(env.candidatePassword);
  await page.locator('button[type="submit"]:has-text("Log in"), button[type="submit"]:has-text("Login")').first().click();
  await page.waitForURL(/dashboard|home|profile|jobs|application/, { timeout: 30000 });
  console.log(`Post-login URL: ${page.url()}`);

  // ── Probe dashboard header for messages/account buttons ──────────────────
  console.log('\n=== DASHBOARD HEADER PROBE ===');
  const headerHtml = await page.evaluate(() => {
    const header = document.querySelector('header, .header-area, nav.navbar, .top-bar, .header');
    return header ? header.innerHTML.substring(0, 5000) : 'NO HEADER FOUND';
  });
  console.log('Header HTML (truncated):\n', headerHtml.substring(0, 3000));

  // Look for all links/buttons in header
  console.log('\n=== HEADER LINKS/BUTTONS ===');
  const headerItems = await page.evaluate(() => {
    const items: string[] = [];
    const header = document.querySelector('header, .header-area, nav.navbar, .top-bar');
    if (!header) { items.push('NO HEADER'); return items; }
    for (const el of Array.from(header.querySelectorAll('a, button'))) {
      const text = (el.textContent ?? '').trim().substring(0, 50);
      const href = (el as HTMLAnchorElement).href ?? '';
      const classes = el.className;
      const rect = el.getBoundingClientRect();
      items.push(`[${el.tagName}] text="${text}" href="${href}" class="${classes}" y=${Math.round(rect.y)}`);
    }
    return items;
  });
  headerItems.forEach(i => console.log(i));

  // ── Navigate to messages page ──────────────────────────────────────────
  console.log('\n=== NAVIGATING TO /messages ===');
  await page.goto(`${env.jobratorSite}messages`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log(`Messages page URL: ${page.url()}`);

  // Probe the messages page structure
  console.log('\n=== MESSAGES PAGE HTML STRUCTURE ===');
  const msgPageHtml = await page.evaluate(() => {
    const main = document.querySelector('main, .content, #content, body');
    return main ? main.innerHTML.substring(0, 6000) : 'NO MAIN CONTENT';
  });
  console.log(msgPageHtml.substring(0, 4000));

  // Look for all meaningful elements
  console.log('\n=== MESSAGES PAGE ELEMENTS ===');
  const msgItems = await page.evaluate(() => {
    const items: string[] = [];
    for (const el of Array.from(document.querySelectorAll('li, .item, [class*="message"], [class*="inbox"], [class*="chat"], [class*="convo"]'))) {
      const text = (el.textContent ?? '').trim().substring(0, 60);
      const classes = el.className;
      const tag = el.tagName;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        items.push(`[${tag}] class="${classes}" text="${text.replace(/\s+/g,' ')}"`);
      }
    }
    return items.slice(0, 50);
  });
  msgItems.forEach(i => console.log(i));

  // ── Look for sidebar/left-panel message links on /jobs ────────────────
  console.log('\n=== BACK TO JOBS/DASHBOARD - SIDEBAR PROBE ===');
  await page.goto(`${env.jobratorSite}jobs`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const sidebarHtml = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar, aside, .left-panel, [class*="sidebar"], [class*="left-nav"]');
    return sidebar ? sidebar.innerHTML.substring(0, 4000) : 'NO SIDEBAR FOUND';
  });
  console.log('Sidebar HTML:\n', sidebarHtml.substring(0, 3000));

  console.log('\n=== ALL PAGE LINKS CONTAINING "message" ===');
  const msgLinks = await page.evaluate(() => {
    const links: string[] = [];
    for (const el of Array.from(document.querySelectorAll('a, button'))) {
      const text = (el.textContent ?? '').toLowerCase();
      const href = (el as HTMLAnchorElement).href ?? '';
      if (/message|inbox|chat/.test(text + href)) {
        const classes = el.className;
        const rect = el.getBoundingClientRect();
        links.push(`[${el.tagName}] text="${(el.textContent??'').trim().substring(0,50)}" href="${href}" class="${classes}" y=${Math.round(rect.y)} visible=${rect.width>0}`);
      }
    }
    return links;
  });
  msgLinks.forEach(l => console.log(l));

  await browser.close();
  console.log('\nProbe complete.');
}

main().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
