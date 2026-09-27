/**
 * sprint54_notifications.ts — dumps the candidate notification feed so ADO
 * #28941 (skill-test email after application) and #29062 (48h/24h/2h expiry
 * reminders) can be judged on actual notification records rather than on a
 * substring match against rendered page text.
 */
import { chromium } from 'playwright';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  const { LoginPage } = await import('../pages/LoginPage');
  const { EnvConfig } = await import('../config/env.config');
  const env = EnvConfig.getInstance();

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  const payloads: any[] = [];
  page.on('response', async (r) => {
    if (!/candidate-notifications/i.test(r.url())) return;
    try {
      payloads.push(await r.json());
    } catch {
      /* non-JSON */
    }
  });

  const lp = new LoginPage(page);
  await lp.navigate();
  await lp.login(env.candidateEmail, env.candidatePassword);
  await page.waitForURL(/dashboard|jobs|home/i, { timeout: 60000 }).catch(() => {});

  await page.goto(env.jobratorSite.replace(/\/$/, '') + '/dashboard/notifications', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(6000);

  const items: any[] = [];
  for (const p of payloads) {
    const arr = p?.data ?? p?.notifications ?? (Array.isArray(p) ? p : []);
    if (Array.isArray(arr)) items.push(...arr);
  }

  console.log(`\nNotification records returned: ${items.length}\n`);
  for (const n of items.slice(0, 40)) {
    const title = n.title ?? n.subject ?? n.type ?? '(no title)';
    const msg = String(n.message ?? n.body ?? n.description ?? '').replace(/\s+/g, ' ').slice(0, 140);
    console.log(`  [${n.created_at ?? n.createdAt ?? '?'}] ${title} :: ${msg}`);
  }

  const blob = JSON.stringify(items).toLowerCase();
  console.log('\n── keyword scan over notification records ──');
  for (const kw of ['skill test', 'skill_test', 'assessment', 'expir', '48', '24 hour', '2 hour', 'reminder']) {
    console.log(`  "${kw}": ${blob.includes(kw)}`);
  }

  await browser.close();
})();
